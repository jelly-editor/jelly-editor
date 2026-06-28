import type { DirEntry, ExtensionContext } from "@jelly/sdk";
import { getCurrentWindowLabel, ipc } from "@jelly/ipc";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../store";

const HIGHLIGHT = ["bg-accent/15", "shadow-[inset_0_0_0_1px]", "shadow-accent/50"];

interface PendingDrag {
  pointerId: number;
  startX: number;
  startY: number;
  paths: string[];
  label: string;
}

export interface ActiveFileDrag extends PendingDrag {
  x: number;
  y: number;
  copy: boolean;
}

interface DragSession {
  paths: string[];
  alt: boolean;
  cmd: boolean;
  source: string;
}

interface UseFileTreeDndOptions {
  ctx: ExtensionContext;
  root: string;
  treeRef: React.MutableRefObject<HTMLDivElement | null>;
  rowEls: React.MutableRefObject<Map<string, HTMLElement>>;
  canDrop: (srcs: string[], destDir: string, asCopy: boolean) => boolean;
  transferAll: (froms: string[], destDir: string, asCopy: boolean) => Promise<void>;
}

function parentOf(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}

function destDirAt(el: Element | null, fallbackRoot: string): string {
  const rowEl = el?.closest<HTMLElement>("[data-path]");
  if (!rowEl?.dataset.path) return fallbackRoot;
  return rowEl.dataset.dir === "1" ? rowEl.dataset.path : parentOf(rowEl.dataset.path);
}

export function DragGhost({ drag }: { drag: ActiveFileDrag }) {
  return (
    <div
      className="fixed z-[10000] pointer-events-none flex items-center gap-2 rounded-[5px] bg-bg-elevated/95 border border-border px-2 h-[24px] text-[12px] text-text shadow-lg"
      style={{ left: drag.x + 12, top: drag.y + 10 }}
    >
      {drag.copy && (
        <span className="flex items-center justify-center w-[14px] h-[14px] rounded-full bg-accent text-bg text-[12px] leading-none font-semibold">
          +
        </span>
      )}
      <span className="max-w-[220px] truncate">{drag.label}</span>
    </div>
  );
}

export function useFileTreeDnd({
  ctx,
  root,
  treeRef,
  rowEls,
  canDrop,
  transferAll,
}: UseFileTreeDndOptions) {
  const highlightedDir = useRef<string | null>(null);
  const incoming = useRef<DragSession | null>(null);
  const incomingRead = useRef(false);
  const dndRef = useRef<(e: { phase: string; paths: string[]; x: number; y: number }) => void>(() => {});
  const altDown = useRef(false);
  const cmdDown = useRef(false);
  const pendingDrag = useRef<PendingDrag | null>(null);
  const activeDrag = useRef<ActiveFileDrag | null>(null);
  const pointerListeners = useRef<{
    move: (ev: PointerEvent) => void;
    up: (ev: PointerEvent) => void;
    cancel: () => void;
  } | null>(null);
  const suppressNextClick = useRef(false);
  const [dragGhost, setDragGhost] = useState<ActiveFileDrag | null>(null);
  const windowLabel = getCurrentWindowLabel();

  function highlight(destDir: string | null) {
    if (highlightedDir.current === destDir) return;
    const prev = highlightedDir.current;
    if (prev) rowEls.current.get(prev)?.classList.remove(...HIGHLIGHT);
    if (destDir) rowEls.current.get(destDir)?.classList.add(...HIGHLIGHT);
    highlightedDir.current = destDir;
  }

  function cleanupPointerDrag() {
    pendingDrag.current = null;
    activeDrag.current = null;
    setDragGhost(null);
    highlight(null);
    document.body.style.cursor = "";
    void ctx.commands.execute("editor.fileDragLeave");
    const listeners = pointerListeners.current;
    if (listeners) {
      window.removeEventListener("pointermove", listeners.move);
      window.removeEventListener("pointerup", listeners.up);
      window.removeEventListener("pointercancel", listeners.cancel);
      pointerListeners.current = null;
    }
  }

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    ipc.drag.onDrop((e) => void dndRef.current(e)).then((un) => (cancelled ? un() : (dispose = un)));

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Alt" && e.key !== "Meta") return;
      if (e.key === "Alt") altDown.current = e.type === "keydown";
      if (e.key === "Meta") cmdDown.current = e.type === "keydown";
      if (activeDrag.current) {
        activeDrag.current = { ...activeDrag.current, copy: altDown.current };
        document.body.style.cursor = altDown.current ? "copy" : "grabbing";
        setDragGhost(activeDrag.current);
      }
    };

    const onBlur = () => {
      altDown.current = false;
      cmdDown.current = false;
      if (activeDrag.current) {
        activeDrag.current = { ...activeDrag.current, copy: false };
        document.body.style.cursor = "grabbing";
        setDragGhost(activeDrag.current);
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      cancelled = true;
      cleanupPointerDrag();
      dispose?.();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  function consumeSuppressedClick() {
    if (!suppressNextClick.current) return false;
    suppressNextClick.current = false;
    return true;
  }

  function onRowPointerDown(e: React.PointerEvent, entry: DirEntry) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const store = useWorkspaceStore.getState();
    if (!store.selected.has(entry.path)) store.setSelection([entry.path]);
    const selected = useWorkspaceStore.getState().selected;
    const paths = selected.has(entry.path) && selected.size > 1 ? [...selected] : [entry.path];
    const label = paths.length > 1 ? `${paths.length} items` : entry.name;
    cleanupPointerDrag();
    pendingDrag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, paths, label };
    const listeners = {
      move: (ev: PointerEvent) => onWindowPointerMove(ev),
      up: (ev: PointerEvent) => void onWindowPointerUp(ev),
      cancel: () => onWindowPointerCancel(),
    };
    pointerListeners.current = listeners;
    window.addEventListener("pointermove", listeners.move);
    window.addEventListener("pointerup", listeners.up, { once: true });
    window.addEventListener("pointercancel", listeners.cancel, { once: true });
  }

  function updateInternalDrag(ev: PointerEvent): ActiveFileDrag | null {
    const pending = pendingDrag.current;
    if (!pending || pending.pointerId !== ev.pointerId) return activeDrag.current;

    let active = activeDrag.current;
    if (!active) {
      const dx = ev.clientX - pending.startX;
      const dy = ev.clientY - pending.startY;
      if (Math.hypot(dx, dy) < 4) return null;
      suppressNextClick.current = true;
      active = { ...pending, x: ev.clientX, y: ev.clientY, copy: altDown.current || ev.altKey };
    } else {
      active = { ...active, x: ev.clientX, y: ev.clientY, copy: altDown.current || ev.altKey };
    }

    activeDrag.current = active;
    document.body.style.cursor = active.copy ? "copy" : "grabbing";
    setDragGhost(active);
    return active;
  }

  function onWindowPointerMove(ev: PointerEvent) {
    const active = updateInternalDrag(ev);
    if (!active) return;
    ev.preventDefault();

    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const overTree = !!(el && treeRef.current?.contains(el));
    if (overTree) {
      void ctx.commands.execute("editor.fileDragLeave");
      const dest = destDirAt(el, root);
      highlight(canDrop(active.paths, dest, active.copy) ? dest : null);
      return;
    }

    highlight(null);
    void ctx.commands.execute("editor.fileDragOver", ev.clientX, ev.clientY);
  }

  async function onWindowPointerUp(ev: PointerEvent) {
    const active = activeDrag.current;
    if (!active || active.pointerId !== ev.pointerId) {
      cleanupPointerDrag();
      return;
    }
    ev.preventDefault();

    const copy = altDown.current || ev.altKey;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const overTree = !!(el && treeRef.current?.contains(el));
    cleanupPointerDrag();

    if (overTree && el) {
      const dest = destDirAt(el, root);
      if (canDrop(active.paths, dest, copy)) await transferAll(active.paths, dest, copy);
      return;
    }

    await ctx.commands.execute("editor.dropFilesAt", active.paths, ev.clientX, ev.clientY);
  }

  function onWindowPointerCancel() {
    cleanupPointerDrag();
  }

  async function onNativeDnd(e: { phase: string; paths: string[]; x: number; y: number }) {
    if (e.phase === "leave") {
      incoming.current = null;
      incomingRead.current = false;
      highlight(null);
      return;
    }
    if (!incomingRead.current) {
      incomingRead.current = true;
      incoming.current = await ipc.drag.readSession();
    }
    const session = incoming.current;
    if (e.phase === "enter") return;

    const el = document.elementFromPoint(e.x, e.y);
    const overTree = !!(el && treeRef.current?.contains(el));
    const copy = session ? (session.source === windowLabel ? session.alt : !session.cmd) : true;

    if (e.phase === "over") {
      const dest = overTree && el ? destDirAt(el, root) : null;
      highlight(dest && session && canDrop(session.paths, dest, copy) ? dest : null);
      return;
    }

    highlight(null);
    incoming.current = null;
    incomingRead.current = false;
    if (!overTree || !el) return;

    const paths = session?.paths.length ? session.paths : e.paths;
    if (!paths.length) return;
    const dest = destDirAt(el, root);
    if (canDrop(paths, dest, copy)) await transferAll(paths, dest, copy);
  }

  dndRef.current = onNativeDnd;

  return {
    dragGhost,
    onRowPointerDown,
    consumeSuppressedClick,
  };
}
