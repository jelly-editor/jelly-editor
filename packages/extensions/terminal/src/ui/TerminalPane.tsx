import type { ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { terminalFontFamily, terminalTheme, useSetting } from "@jelly/ui";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useCallback, useEffect, useRef } from "react";
import { useTerminalStore } from "../store";

const { create: createTerminal, input: terminalInput, resize: terminalResize, close: closeTerminal } =
  ipc.terminal;

function decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** One xterm instance bound to a backend PTY. Created on mount, torn down
 *  (and the PTY killed) on unmount. */
function TermView({ ctx, id, active }: { ctx: ExtensionContext; id: string; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const theme = useSetting(ctx, "ui.theme", "dark") as "dark" | "light";
  const cwd = useTerminalStore((s) => s.cwd);
  const removeTerminal = useTerminalStore((s) => s.removeTerminal);

  useEffect(() => {
    let disposed = false;
    let term: Terminal | null = null;
    let onData: { dispose: () => void } | undefined;
    let observer: ResizeObserver | undefined;

    // Subscribe synchronously so no early PTY output is missed.
    const offOut = ctx.events.on<{ id: string; data: string }>("terminal:output", (p) => {
      if (p.id === id && !disposed) term?.write(decode(p.data));
    });
    const offExit = ctx.events.on<{ id: string }>("terminal:exit", (p) => {
      if (p.id === id && !disposed) removeTerminal(id);
    });

    (async () => {
      try {
        await Promise.all([
          document.fonts.load('400 13px "0xProto Nerd Font Mono"'),
          document.fonts.load('700 13px "0xProto Nerd Font Mono"'),
        ]);
      } catch {
        /* fall back to whatever's available */
      }
      if (disposed || !ref.current) return;

      term = new Terminal({
        fontFamily: terminalFontFamily(),
        fontSize: 12.5,
        lineHeight: 1.2,
        cursorBlink: true,
        theme: terminalTheme(theme),
        allowProposedApi: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(ref.current);
      fit.fit();
      termRef.current = term;
      fitRef.current = fit;

      onData = term.onData((data) => terminalInput(id, data));

      await createTerminal(id, cwd, term.cols, term.rows);

      observer = new ResizeObserver(() => {
        if (!ref.current?.offsetParent || !term) return; // hidden tab
        try {
          fit.fit();
          terminalResize(id, term.cols, term.rows);
        } catch {
          /* element not measurable yet */
        }
      });
      observer.observe(ref.current);
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      onData?.dispose();
      offOut.dispose();
      offExit.dispose();
      closeTerminal(id);
      term?.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      try {
        fitRef.current?.fit();
        const term = termRef.current;
        if (term) {
          terminalResize(id, term.cols, term.rows);
          term.focus();
        }
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [active, id]);

  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = terminalTheme(theme);
  }, [theme]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 px-2 py-1"
      style={{ visibility: active ? "visible" : "hidden" }}
    />
  );
}

export function TerminalPane({ ctx }: { ctx: ExtensionContext }) {
  const { terminals, activeId, visible, height, addTerminal, removeTerminal, setActive, setHeight, toggleVisible } =
    useTerminalStore();

  const startY = useRef(0);
  const startH = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      startY.current = e.clientY;
      startH.current = height;
      const onMove = (ev: MouseEvent) => {
        const delta = startY.current - ev.clientY;
        setHeight(Math.max(80, Math.min(600, startH.current + delta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [height, setHeight],
  );

  // Open a first terminal automatically when the panel is shown empty.
  const autoCreated = useRef(false);
  useEffect(() => {
    if (!visible) {
      autoCreated.current = false;
      return;
    }
    if (terminals.length === 0 && !autoCreated.current) {
      autoCreated.current = true;
      addTerminal();
    }
  }, [visible, terminals.length, addTerminal]);

  return (
    <div
      className="relative flex flex-col bg-bg-elevated border-t border-border shrink-0"
      style={{ height, display: visible ? "flex" : "none" }}
    >
      <div
        className="absolute -top-[3px] left-0 right-0 h-[6px] cursor-row-resize z-10 hover:bg-accent hover:opacity-[0.35] active:bg-accent active:opacity-[0.35]"
        onMouseDown={onMouseDown}
      />
      <div className="flex items-center h-[30px] border-b border-border shrink-0 pr-2">
        <div className="flex items-center flex-1 h-full overflow-x-auto">
          {terminals.map((t) => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                className={`group flex items-center gap-[6px] pl-3 pr-2 h-full border-r border-border cursor-pointer text-[11px] whitespace-nowrap transition-colors duration-[80ms] hover:text-text ${
                  isActive ? "bg-bg text-text" : "text-text-muted"
                }`}
                onClick={() => setActive(t.id)}
              >
                <span>{t.title}</span>
                <button
                  className="flex items-center justify-center w-[14px] h-[14px] rounded-[3px] text-text-muted text-[13px] leading-none opacity-0 group-hover:opacity-100 hover:bg-bg-active hover:text-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTerminal(t.id);
                  }}
                  title="Close terminal"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <button
          className="flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-text-muted cursor-pointer hover:bg-bg-hover hover:text-text"
          onClick={() => addTerminal()}
          title="New terminal"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          className="flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-text-muted cursor-pointer hover:bg-bg-hover hover:text-text"
          onClick={toggleVisible}
          title="Hide terminal"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {terminals.map((t) => (
          <TermView key={t.id} ctx={ctx} id={t.id} active={t.id === activeId} />
        ))}
      </div>
    </div>
  );
}
