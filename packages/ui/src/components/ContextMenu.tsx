import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ContextMenuAction {
  type?: "item";
  label: string;
  onSelect: () => void;
  /** Render in the danger colour (e.g. Delete). */
  danger?: boolean;
  disabled?: boolean;
  /** Optional right-aligned hint, e.g. a keyboard shortcut. */
  hint?: string;
}

export interface ContextMenuSeparator {
  type: "separator";
}

export type ContextMenuEntry = ContextMenuAction | ContextMenuSeparator;

const isSeparator = (e: ContextMenuEntry): e is ContextMenuSeparator =>
  (e as ContextMenuSeparator).type === "separator";

/**
 * A floating, dismissible context menu rendered at a viewport coordinate. It
 * owns its own dismissal (outside click, right-click elsewhere, Escape, scroll,
 * resize) and clamps itself inside the viewport. Stateless beyond positioning —
 * pair it with {@link useContextMenu} to manage open state and the trigger.
 */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y });

  // Re-clamp whenever the requested coordinate changes.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const margin = 6;
    const nx = Math.min(x, window.innerWidth - width - margin);
    const ny = Math.min(y, window.innerHeight - height - margin);
    setPos({ x: Math.max(margin, nx), y: Math.max(margin, ny) });
  }, [x, y]);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[400] min-w-[160px] py-1 bg-bg-elevated border border-border rounded-[6px] shadow-lg animate-[fadeIn_60ms_ease]"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        isSeparator(item) ? (
          <div key={`sep-${i}`} className="my-1 border-t border-border" />
        ) : (
          <button
            key={item.label}
            disabled={item.disabled}
            className={`flex items-center gap-4 w-full text-left px-3 h-[26px] text-[12px] cursor-pointer disabled:cursor-default disabled:opacity-40 hover:enabled:bg-bg-hover ${
              item.danger ? "text-danger" : "text-text"
            }`}
            onClick={() => {
              if (item.disabled) return;
              onClose();
              item.onSelect();
            }}
          >
            <span className="flex-1">{item.label}</span>
            {item.hint && <span className="text-text-dim text-[11px]">{item.hint}</span>}
          </button>
        ),
      )}
    </div>
  );
}

export interface ContextMenuState<T> {
  x: number;
  y: number;
  data: T;
}

/**
 * Manage context-menu open state and the right-click trigger. `data` carries
 * whatever the menu needs about its target (a tree entry, a tab path, …).
 *
 * ```tsx
 * const menu = useContextMenu<DirEntry>();
 * <Row onContextMenu={(e) => menu.open(e, entry)} />
 * {menu.state && (
 *   <ContextMenu x={menu.state.x} y={menu.state.y} onClose={menu.close}
 *     items={[{ label: "Rename", onSelect: () => rename(menu.state!.data) }]} />
 * )}
 * ```
 */
export function useContextMenu<T = void>() {
  const [state, setState] = useState<ContextMenuState<T> | null>(null);
  const open = useCallback((e: { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number }, data: T) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ x: e.clientX, y: e.clientY, data });
  }, []);
  const close = useCallback(() => setState(null), []);
  return { state, open, close };
}
