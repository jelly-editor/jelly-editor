import type { ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { terminalFontFamily, terminalTheme, useSetting } from "@jelly/ui";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";
import { useTerminalStore } from "../store";

const { create: createTerminal, input: terminalInput, resize: terminalResize, close: closeTerminal } =
  ipc.terminal;

function decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

interface Session {
  el: HTMLDivElement;
  term: Terminal;
  fit: FitAddon;
  offOut: { dispose: () => void };
  offExit: { dispose: () => void };
}

// Sessions outlive the React component so a terminal can be dragged between
// panes (which unmounts/remounts the host) without losing its PTY or scrollback.
const sessions = new Map<string, Session>();

// Sessions whose tabs were removed from the layout but whose PTY is still
// running. A layout restore (folder switch) will remount the TerminalView and
// cancel the timer before disposal fires. An explicit user-close that is never
// remounted will let the timer expire and kill the PTY.
const ORPHAN_TTL = 10_000;
const orphaned = new Map<string, ReturnType<typeof setTimeout>>();

// A starting cwd for a not-yet-mounted terminal, keyed by its view id (set by
// "Open in Terminal"). Consumed once when the session is created.
const pendingCwd = new Map<string, string>();
export function setTerminalCwd(id: string, cwd: string) {
  pendingCwd.set(id, cwd);
}

/**
 * Schedule a session for disposal after ORPHAN_TTL ms. If the TerminalView
 * remounts before the timer fires (e.g. layout restored on folder switch back),
 * the disposal is cancelled.
 */
export function scheduleDisposeSession(id: string): void {
  if (!sessions.has(id) || orphaned.has(id)) return;
  orphaned.set(
    id,
    setTimeout(() => {
      orphaned.delete(id);
      disposeSession(id);
    }, ORPHAN_TTL),
  );
}

function themeOf(ctx: ExtensionContext) {
  return (ctx.settings.get<"dark" | "light">("ui.theme") ?? "dark") as "dark" | "light";
}

function createSession(ctx: ExtensionContext, id: string, host: HTMLElement): Session {
  const el = document.createElement("div");
  el.className =
    "absolute inset-0 overflow-hidden bg-bg-elevated pl-3 " +
    "[&_.xterm]:h-full [&_.xterm]:bg-inherit " +
    "[&_.xterm-viewport]:!bg-inherit [&_.xterm-screen]:min-h-full";
  host.appendChild(el);

  const term = new Terminal({
    fontFamily: terminalFontFamily(),
    fontSize: 12.5,
    lineHeight: 1.2,
    cursorBlink: true,
    theme: terminalTheme(themeOf(ctx)),
    allowProposedApi: true,
  });
  term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
    if (e.type !== "keydown") return true;
    if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "Enter") {
      e.preventDefault();
      void terminalInput(id, "\x1b[200~\r\x1b[201~");
      return false;
    }
    if (e.metaKey && e.key === "Backspace") {
      e.preventDefault();
      void terminalInput(id, "\x15");
      return false;
    }
    return true;
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(el);
  fit.fit();
  term.onData((data) => terminalInput(id, data));

  const offOut = ctx.events.on<{ id: string; data: string }>("terminal:output", (p) => {
    if (p.id === id) term.write(decode(p.data));
  });
  // When the PTY exits, dispose immediately (no grace period needed — the
  // process is done) then close the tab.
  const offExit = ctx.events.on<{ id: string }>("terminal:exit", (p) => {
    if (p.id === id) {
      disposeSession(id);
      void ctx.commands.execute("editor.closeView", "terminal", id);
    }
  });

  const cwd = pendingCwd.get(id) ?? useTerminalStore.getState().cwd;
  pendingCwd.delete(id);
  void createTerminal(id, cwd, term.cols, term.rows);
  const session: Session = { el, term, fit, offOut, offExit };
  sessions.set(id, session);
  return session;
}

/** Tear a terminal down for good (PTY + xterm). */
export function disposeSession(id: string) {
  const timer = orphaned.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    orphaned.delete(id);
  }
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  s.offOut.dispose();
  s.offExit.dispose();
  void closeTerminal(id);
  s.term.dispose();
  s.el.remove();
}

export function TerminalView({ ctx, id, active }: { ctx: ExtensionContext; id: string; active: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const theme = useSetting(ctx, "ui.theme", "dark") as "dark" | "light";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Cancel any pending disposal — this session is being remounted (e.g.
    // the user switched back to the folder whose layout includes this terminal).
    const timer = orphaned.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      orphaned.delete(id);
    }

    const session = sessions.get(id) ?? createSession(ctx, id, host);
    if (session.el.parentNode !== host) host.appendChild(session.el);

    const refit = () => {
      if (!host.offsetParent) return; // hidden tab — skip
      try {
        session.fit.fit();
        terminalResize(id, session.term.cols, session.term.rows);
      } catch {
        /* not measurable yet */
      }
    };
    const observer = new ResizeObserver(refit);
    observer.observe(host);
    const raf = requestAnimationFrame(refit);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      // Detach the DOM but keep the session alive for a possible re-mount.
      if (session.el.parentNode === host) host.removeChild(session.el);
    };
  }, [ctx, id]);

  useEffect(() => {
    const s = sessions.get(id);
    if (s) s.term.options.theme = terminalTheme(theme);
  }, [theme, id]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      const s = sessions.get(id);
      if (!s) return;
      try {
        s.fit.fit();
        terminalResize(id, s.term.cols, s.term.rows);
        s.term.focus();
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [active, id]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
