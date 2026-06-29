import type { DirEntry, DragSession, ExtensionContext } from "@jelly/sdk";
import { getCurrentWindowLabel, ipc } from "@jelly/ipc";
import { FileIcon } from "@jelly/ui";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../store";

const HIGHLIGHT = ["bg-accent/15", "shadow-[inset_0_0_0_1px]", "shadow-accent/50"];
const THRESHOLD = 4;

interface UseFileTreeDndOptions {
  ctx: ExtensionContext;
  root: string;
  treeRef: React.MutableRefObject<HTMLDivElement | null>;
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

  const dpr = 1;
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

export function useFileTreeDnd({ ctx, root, treeRef, highlightEls, canDrop, transferAll }: UseFileTreeDndOptions) {
  const highlightedDir = useRef<string | null>(null);
  const dndRef = useRef<(e: { phase: string; paths: string[]; x: number; y: number }) => void>(() => {});
  const incoming = useRef<DragSession | null>(null);
  const incomingPaths = useRef<string[]>([]);
  const incomingRead = useRef(false);
  const incomingReadPromise = useRef<Promise<void> | null>(null);
  const suppressNextClick = useRef(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<{ name: string; isDir: boolean; count: number; copy: boolean } | null>(null);
  const windowLabel = getCurrentWindowLabel();

  function highlight(destDir: string | null) {
    if (highlightedDir.current === destDir) return;
    const prev = highlightedDir.current;
    if (prev) highlightEls.current.get(prev)?.classList.remove(...HIGHLIGHT);
    if (destDir) highlightEls.current.get(destDir)?.classList.add(...HIGHLIGHT);
    highlightedDir.current = destDir;
  }

  function destDirAt(x: number, y: number): string | null {
    const tree = treeRef.current;
    if (!tree || !pointInRect(x, y, tree.getBoundingClientRect())) return null;
    const row = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-path]") as HTMLElement | null;
    if (!row?.dataset.path) return root;
    return row.dataset.dir === "1" ? row.dataset.path : parentOf(row.dataset.path);
  }

  function movePreview(x: number, y: number) {
    const el = previewRef.current;
    if (el) el.style.transform = `translate(${x + 14}px, ${y + 12}px)`;
  }

  function onRowPointerDown(e: React.PointerEvent, entry: DirEntry) {
    if (e.button !== 0 || e.ctrlKey || e.shiftKey) return;
    suppressNextClick.current = false;
    const store = useWorkspaceStore.getState();
    if (!e.metaKey && !store.selected.has(entry.path)) store.setSelection([entry.path]);
    const selected = useWorkspaceStore.getState().selected;
    const paths = selected.has(entry.path) && selected.size > 1 ? [...selected] : [entry.path];

    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;
    let editorHint = false;
    let handedOff = false;
    let copyShown = false;

    const teardown = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      try {
        treeRef.current?.releasePointerCapture(pointerId);
      } catch {
        /* capture may already be gone */
      }
      document.body.removeAttribute("data-dragging");
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      highlight(null);
      setPreview(null);
      if (editorHint) void ctx.commands.execute("editor.fileDragLeave");
    };

    const handOffToNative = (ev: PointerEvent) => {
      handedOff = true;
      const alt = ev.altKey;
      const cmd = ev.metaKey;
      const label = paths.length > 1 ? `${paths.length} items` : entry.name;
      teardown();
      void ipc.drag
        .start(paths, alt, cmd, makeDragPreview(label))
        .catch((err) => console.error("[files] native file drag failed:", err));
    };

    const move = (ev: PointerEvent) => {
      if (handedOff) return;
      if (!started) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < THRESHOLD) return;
        started = true;
        copyShown = ev.altKey;
        suppressNextClick.current = true;
        document.body.setAttribute("data-dragging", "1");
        document.body.style.userSelect = "none";
        document.body.style.cursor = ev.altKey ? "copy" : "grabbing";
        setPreview({ name: entry.name, isDir: entry.isDir, count: paths.length, copy: ev.altKey });
        try {
          treeRef.current?.setPointerCapture(pointerId);
        } catch {
          /* not capturable; window listeners still track movement */
        }
      }

      if (ev.clientX <= 0 || ev.clientY <= 0 || ev.clientX >= window.innerWidth || ev.clientY >= window.innerHeight) {
        handOffToNative(ev);
        return;
      }

      movePreview(ev.clientX, ev.clientY);
      const dest = destDirAt(ev.clientX, ev.clientY);
      const copy = ev.altKey;
      if (copy !== copyShown) {
        copyShown = copy;
        document.body.style.cursor = copy ? "copy" : "grabbing";
        setPreview((p) => (p ? { ...p, copy } : p));
      }
      if (dest) {
        highlight(canDrop(paths, dest, copy) ? dest : null);
        if (editorHint) {
          editorHint = false;
          void ctx.commands.execute("editor.fileDragLeave");
        }
      } else {
        highlight(null);
        editorHint = true;
        void ctx.commands.execute("editor.fileDragOver", ev.clientX, ev.clientY);
      }
    };

    const up = (ev: PointerEvent) => {
      if (handedOff) return;
      const wasDragging = started;
      const dest = destDirAt(ev.clientX, ev.clientY);
      const copy = ev.altKey;
      const overEditor = editorHint;
      teardown();
      if (!wasDragging) return;
      if (dest) {
        if (canDrop(paths, dest, copy)) void transferAll(paths, dest, copy);
      } else if (overEditor) {
        void ctx.commands.execute("editor.dropFilesAt", paths, ev.clientX, ev.clientY);
      }
    };

    const cancel = () => {
      if (!handedOff) teardown();
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Alt" || !started || handedOff) return;
      const copy = ev.type === "keydown";
      if (copy === copyShown) return;
      copyShown = copy;
      document.body.style.cursor = copy ? "copy" : "grabbing";
      setPreview((p) => (p ? { ...p, copy } : p));
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
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
      })
      .finally(() => {
        incomingReadPromise.current = null;
      });
    await incomingReadPromise.current;
  }

  async function onNativeDnd(e: { phase: string; paths: string[]; x: number; y: number }) {
    if (e.phase === "leave") {
      resetIncoming();
      return;
    }
    await ensureIncoming(e.paths);
    const session = incoming.current;
    const paths = session?.paths.length ? session.paths : incomingPaths.current;
    const dest = destDirAt(e.x, e.y);
    const copy = isCopyDrop(session, windowLabel);

    if (e.phase === "enter" || e.phase === "over") {
      highlight(dest && canDrop(paths, dest, copy) ? dest : null);
      return;
    }

    highlight(null);
    if (dest && canDrop(paths, dest, copy)) await transferAll(paths, dest, copy);
    resetIncoming();
  }

  dndRef.current = onNativeDnd;

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    ipc.drag.onDrop((e) => void dndRef.current(e)).then((un) => (cancelled ? un() : (dispose = un)));
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  function consumeSuppressedClick() {
    if (!suppressNextClick.current) return false;
    suppressNextClick.current = false;
    return true;
  }

  const overlay = preview ? (
    <div
      ref={previewRef}
      className="pointer-events-none fixed left-0 top-0 z-[360] flex items-center gap-[6px] pl-[9px] pr-[12px] h-[28px] bg-bg-elevated border border-border rounded-[6px] shadow-lg text-[12px] text-text"
    >
      <FileIcon name={preview.name} isDir={preview.isDir} />
      <span className="max-w-[220px] truncate">{preview.count > 1 ? `${preview.count} items` : preview.name}</span>
      {preview.copy && (
        <span className="ml-[2px] flex h-[14px] w-[14px] items-center justify-center rounded-full bg-success text-[11px] font-bold leading-none text-white">
          +
        </span>
      )}
    </div>
  ) : null;

  return { onRowPointerDown, consumeSuppressedClick, overlay };
}
