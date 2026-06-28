import type { DirEntry, DragSession, ExtensionContext } from "@jelly/sdk";
import { getCurrentWindowLabel, ipc } from "@jelly/ipc";
import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "../store";

const HIGHLIGHT = ["bg-accent/15", "shadow-[inset_0_0_0_1px]", "shadow-accent/50"];

interface PendingDrag {
  pointerId: number;
  startX: number;
  startY: number;
  paths: string[];
  label: string;
  started: boolean;
}

interface UseFileTreeDndOptions {
  ctx: ExtensionContext;
  root: string;
  treeRef: React.MutableRefObject<HTMLDivElement | null>;
  rowEls: React.MutableRefObject<Map<string, HTMLElement>>;
  highlightEls: React.MutableRefObject<Map<string, HTMLElement>>;
  canDrop: (srcs: string[], destDir: string, asCopy: boolean) => boolean;
  transferAll: (froms: string[], destDir: string, asCopy: boolean) => Promise<void>;
}

function parentOf(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isCopyDrop(session: DragSession | null, windowLabel: string): boolean {
  if (!session) return true;
  return session.source === windowLabel ? session.alt : !session.cmd;
}

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitLabel(ctx: CanvasRenderingContext2D, label: string, maxWidth: number): string {
  if (ctx.measureText(label).width <= maxWidth) return label;
  const ellipsis = "...";
  let lo = 0;
  let hi = label.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(label.slice(0, mid) + ellipsis).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return label.slice(0, lo) + ellipsis;
}

function makeDragPreview(label: string): string | undefined {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  const font = "12px Inter, system-ui, sans-serif";
  const iconSize = 16;
  const gap = 7;
  const padX = 9;
  const height = 28;
  const maxTextWidth = 220;

  ctx.font = font;
  const fitted = fitLabel(ctx, label, maxTextWidth);
  const textWidth = Math.ceil(ctx.measureText(fitted).width);
  const width = padX * 2 + iconSize + gap + textWidth;

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);
  ctx.font = font;
  ctx.textBaseline = "middle";

  roundedRect(ctx, 0.5, 0.5, width - 1, height - 1, 6);
  ctx.fillStyle = cssVar("--color-bg-elevated", "rgba(30, 30, 30, 0.96)");
  ctx.fill();
  ctx.strokeStyle = cssVar("--color-border", "rgba(120, 120, 120, 0.35)");
  ctx.lineWidth = 1;
  ctx.stroke();

  const iconX = padX;
  const iconY = (height - iconSize) / 2;
  roundedRect(ctx, iconX, iconY, iconSize, iconSize, 3);
  ctx.fillStyle = cssVar("--color-bg-active", "rgba(80, 80, 80, 0.9)");
  ctx.fill();
  ctx.fillStyle = cssVar("--color-accent", "rgb(130, 90, 255)");
  ctx.fillRect(iconX + 4, iconY + 4, iconSize - 8, 1.5);
  ctx.fillRect(iconX + 4, iconY + 7, iconSize - 6, 1.5);
  ctx.fillRect(iconX + 4, iconY + 10, iconSize - 9, 1.5);

  ctx.fillStyle = cssVar("--color-text", "rgb(235, 235, 235)");
  ctx.fillText(fitted, iconX + iconSize + gap, height / 2 + 0.5);

  return canvas.toDataURL("image/png");
}

export function useFileTreeDnd({
  ctx,
  root,
  treeRef,
  rowEls,
  highlightEls,
  canDrop,
  transferAll,
}: UseFileTreeDndOptions) {
  const highlightedDir = useRef<string | null>(null);
  const incoming = useRef<DragSession | null>(null);
  const incomingPaths = useRef<string[]>([]);
  const incomingRead = useRef(false);
  const incomingReadPromise = useRef<Promise<void> | null>(null);
  const dndRef = useRef<(e: { phase: string; paths: string[]; x: number; y: number }) => void>(() => {});
  const altDown = useRef(false);
  const cmdDown = useRef(false);
  const nativeDragActive = useRef(false);
  const pendingDrag = useRef<PendingDrag | null>(null);
  const pointerListeners = useRef<{
    move: (ev: PointerEvent) => void;
    up: (ev: PointerEvent) => void;
    cancel: () => void;
  } | null>(null);
  const suppressNextClick = useRef(false);
  const windowLabel = getCurrentWindowLabel();

  function highlight(destDir: string | null) {
    if (highlightedDir.current === destDir) return;
    const prev = highlightedDir.current;
    if (prev) highlightEls.current.get(prev)?.classList.remove(...HIGHLIGHT);
    if (destDir) highlightEls.current.get(destDir)?.classList.add(...HIGHLIGHT);
    highlightedDir.current = destDir;
  }

  function destDirAtPoint(x: number, y: number): string | null {
    const tree = treeRef.current;
    if (!tree || !pointInRect(x, y, tree.getBoundingClientRect())) return null;

    for (const row of rowEls.current.values()) {
      if (row === tree || !row.dataset.path || !pointInRect(x, y, row.getBoundingClientRect())) continue;
      return row.dataset.dir === "1" ? row.dataset.path : parentOf(row.dataset.path);
    }

    return root;
  }

  function cleanupPointerDrag(clearDropUi = true) {
    pendingDrag.current = null;
    if (clearDropUi) highlight(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (clearDropUi) void ctx.commands.execute("editor.fileDragLeave");
    const listeners = pointerListeners.current;
    if (listeners) {
      window.removeEventListener("pointermove", listeners.move);
      window.removeEventListener("pointerup", listeners.up);
      window.removeEventListener("pointercancel", listeners.cancel);
      pointerListeners.current = null;
    }
  }

  function resetIncoming() {
    incoming.current = null;
    incomingPaths.current = [];
    incomingRead.current = false;
    incomingReadPromise.current = null;
    highlight(null);
  }

  async function ensureIncoming(paths: string[]) {
    if (paths.length) incomingPaths.current = paths;
    if (incomingRead.current) {
      if (incomingReadPromise.current) await incomingReadPromise.current;
      return;
    }
    incomingRead.current = true;
    incomingReadPromise.current = ipc.drag
      .readSession()
      .then((session) => {
        incoming.current = session;
        if (session) {
          altDown.current = session.alt;
          cmdDown.current = session.cmd;
        }
      })
      .finally(() => {
        incomingReadPromise.current = null;
      });
    await incomingReadPromise.current;
  }

  function applyModifierState(alt: boolean, cmd: boolean) {
    altDown.current = alt;
    cmdDown.current = cmd;
    if (incoming.current) incoming.current = { ...incoming.current, alt, cmd };
    void ipc.drag.updateModifiers(alt, cmd);
  }

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    ipc.drag.onDrop((e) => void dndRef.current(e)).then((un) => (cancelled ? un() : (dispose = un)));

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Alt" && e.key !== "Meta") return;
      applyModifierState(
        e.key === "Alt" ? e.type === "keydown" : altDown.current,
        e.key === "Meta" ? e.type === "keydown" : cmdDown.current,
      );
    };

    const onBlur = () => {
      if (nativeDragActive.current) {
        altDown.current = false;
        cmdDown.current = false;
        return;
      }
      applyModifierState(false, false);
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
    if (e.button !== 0 || e.ctrlKey || e.shiftKey) return;
    const store = useWorkspaceStore.getState();
    if (!e.metaKey && !store.selected.has(entry.path)) store.setSelection([entry.path]);
    const selected = useWorkspaceStore.getState().selected;
    const paths = selected.has(entry.path) && selected.size > 1 ? [...selected] : [entry.path];
    const label = paths.length > 1 ? `${paths.length} items` : entry.name;
    cleanupPointerDrag();
    pendingDrag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, paths, label, started: false };
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

  function startNativeDrag(pending: PendingDrag, ev: PointerEvent) {
    pending.started = true;
    suppressNextClick.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    const alt = altDown.current || ev.altKey;
    const cmd = cmdDown.current || ev.metaKey;
    applyModifierState(alt, cmd);
    nativeDragActive.current = true;
    cleanupPointerDrag(false);
    void ipc.drag
      .start(pending.paths, alt, cmd, makeDragPreview(pending.label))
      .catch((err) => {
        console.error("[files] native file drag failed:", err);
      })
      .finally(() => {
        nativeDragActive.current = false;
        cleanupPointerDrag();
      });
  }

  function updateNativeDrag(ev: PointerEvent): boolean {
    const pending = pendingDrag.current;
    if (!pending || pending.pointerId !== ev.pointerId) return false;
    if (pending.started) return true;
    const dx = ev.clientX - pending.startX;
    const dy = ev.clientY - pending.startY;
    if (Math.hypot(dx, dy) < 4) return false;
    startNativeDrag(pending, ev);
    return true;
  }

  function onWindowPointerMove(ev: PointerEvent) {
    if (!updateNativeDrag(ev)) return;
    ev.preventDefault();
  }

  function onWindowPointerUp(ev: PointerEvent) {
    ev.preventDefault();
    cleanupPointerDrag();
  }

  function onWindowPointerCancel() {
    cleanupPointerDrag();
  }

  async function onNativeDnd(e: { phase: string; paths: string[]; x: number; y: number }) {
    if (e.phase === "leave") {
      resetIncoming();
      return;
    }
    await ensureIncoming(e.paths);
    const session = incoming.current;
    const paths = session?.paths.length ? session.paths : incomingPaths.current;

    const dest = destDirAtPoint(e.x, e.y);
    const copy = isCopyDrop(session, windowLabel);

    if (e.phase === "enter" || e.phase === "over") {
      highlight(dest && canDrop(paths, dest, copy) ? dest : null);
      return;
    }

    highlight(null);
    if (!dest) {
      resetIncoming();
      return;
    }

    if (canDrop(paths, dest, copy)) await transferAll(paths, dest, copy);
    resetIncoming();
  }

  dndRef.current = onNativeDnd;

  return {
    onRowPointerDown,
    consumeSuppressedClick,
  };
}
