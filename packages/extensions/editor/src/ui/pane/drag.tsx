import { useRef, useState } from "react";
import { type Side, useEditorStore } from "../../store";

export interface DragInfo {
  fromPaneId: string;
  path: string;
  name: string;
}
export type DropTarget =
  | { kind: "move"; paneId: string }
  | { kind: "pane-edge"; paneId: string; side: Side }
  | null;
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface DropHint {
  target: DropTarget;
  rect: Rect;
  label: string;
}

export type BeginDrag = (e: React.PointerEvent, info: DragInfo) => void;

function halfRect(r: DOMRect, side: Side): Rect {
  if (side === "left") return { x: r.left, y: r.top, w: r.width / 2, h: r.height };
  if (side === "right") return { x: r.left + r.width / 2, y: r.top, w: r.width / 2, h: r.height };
  if (side === "top") return { x: r.left, y: r.top, w: r.width, h: r.height / 2 };
  return { x: r.left, y: r.top + r.height / 2, w: r.width, h: r.height / 2 };
}

/** Custom pointer-driven tab drag: a transform-positioned preview (no native
 *  drag-image lag) plus center-to-merge / edge-to-split drop zones. */
export function useTabDrag() {
  const moveTab = useEditorStore((s) => s.moveTab);
  const dropOnPaneEdge = useEditorStore((s) => s.dropTabOnPaneEdge);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const setActivePane = useEditorStore((s) => s.setActivePane);

  const [name, setName] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropHint | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<DropTarget>(null);

  const position = (x: number, y: number) => {
    const el = previewRef.current;
    if (el) el.style.transform = `translate(${x + 14}px, ${y + 12}px)`;
  };

  const hitTest = (x: number, y: number): DropHint | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    // Over a tab strip → always merge into that pane (never a split).
    const tabbar = el?.closest("[data-tabbar]") as HTMLElement | null;
    if (tabbar) {
      const paneId = tabbar.getAttribute("data-tabbar")!;
      const pr = (tabbar.closest("[data-pane-id]") ?? tabbar).getBoundingClientRect();
      return { target: { kind: "move", paneId }, rect: { x: pr.left, y: pr.top, w: pr.width, h: pr.height }, label: "Move here" };
    }
    const paneEl = el?.closest("[data-pane-id]") as HTMLElement | null;
    if (!paneEl) return null;
    const paneId = paneEl.getAttribute("data-pane-id")!;
    const r = paneEl.getBoundingClientRect();
    const fx = (x - r.left) / r.width;
    const fy = (y - r.top) / r.height;
    const m = Math.min(fx, 1 - fx, fy, 1 - fy);
    // Only the outer ~18% on a side splits; the whole middle merges.
    if (m >= 0.18) return { target: { kind: "move", paneId }, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, label: "Move here" };
    const side: Side = m === fx ? "left" : m === 1 - fx ? "right" : m === fy ? "top" : "bottom";
    return { target: { kind: "pane-edge", paneId, side }, rect: halfRect(r, side), label: `Split ${side}` };
  };

  const begin: BeginDrag = (e, info) => {
    if (e.button !== 0) return;
    e.preventDefault(); // stop the browser starting a text selection
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;
    document.body.setAttribute("data-dragging", "1");
    const move = (ev: PointerEvent) => {
      if (!started) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
        started = true;
        setName(info.name);
        document.body.style.cursor = "grabbing";
      }
      position(ev.clientX, ev.clientY);
      const hit = hitTest(ev.clientX, ev.clientY);
      targetRef.current = hit?.target ?? null;
      setDrop(hit);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.removeAttribute("data-dragging");
      document.body.style.cursor = "";
      if (started) {
        const t = targetRef.current;
        if (t?.kind === "move") moveTab(info.fromPaneId, t.paneId, info.path);
        else if (t?.kind === "pane-edge") dropOnPaneEdge(info.fromPaneId, info.path, t.paneId, t.side);
      } else {
        setActivePane(info.fromPaneId);
        setActiveTab(info.fromPaneId, info.path);
      }
      targetRef.current = null;
      setName(null);
      setDrop(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const overlay = (
    <>
      {drop && (
        <div
          className="pointer-events-none fixed z-[350] flex items-center justify-center bg-accent/15 ring-2 ring-inset ring-accent/70 rounded-[2px] transition-[left,top,width,height] duration-100"
          style={{ left: drop.rect.x, top: drop.rect.y, width: drop.rect.w, height: drop.rect.h }}
        >
          <span className="px-2 py-[3px] rounded-[5px] bg-bg-elevated border border-border shadow text-[11px] text-text">
            {drop.label}
          </span>
        </div>
      )}
      {name && (
        <div
          ref={previewRef}
          className="pointer-events-none fixed left-0 top-0 z-[360] px-[10px] h-[26px] flex items-center bg-bg-elevated border border-border rounded-[5px] shadow-lg text-[12px] text-text"
        >
          {name}
        </div>
      )}
    </>
  );

  return { begin, overlay };
}
