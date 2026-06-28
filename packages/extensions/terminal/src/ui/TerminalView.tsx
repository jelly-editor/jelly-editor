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

function themeOf(ctx: ExtensionContext) {
  return (ctx.settings.get<"dark" | "light">("ui.theme") ?? "dark") as "dark" | "light";
}

function createSession(ctx: ExtensionContext, id: string, host: HTMLElement): Session {
  const el = document.createElement("div");
  el.className =
    "absolute inset-0 overflow-hidden bg-bg-elevated " +
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
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(el);
  fit.fit();
  term.onData((data) => terminalInput(id, data));

  const offOut = ctx.events.on<{ id: string; data: string }>("terminal:output", (p) => {
    if (p.id === id) term.write(decode(p.data));
  });
  const offExit = ctx.events.on<{ id: string }>("terminal:exit", (p) => {
    if (p.id === id) void ctx.commands.execute("editor.closeView", "terminal", id);
  });

  void createTerminal(id, useTerminalStore.getState().cwd, term.cols, term.rows);
  const session: Session = { el, term, fit, offOut, offExit };
  sessions.set(id, session);
  return session;
}

/** Tear a terminal down for good (PTY + xterm). Called when its tab closes. */
export function disposeSession(id: string) {
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
