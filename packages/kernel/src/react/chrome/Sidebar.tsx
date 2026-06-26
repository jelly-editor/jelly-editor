import { useCallback, useRef } from "react";
import { useKernel } from "../kernel-context";
import { useSlotContributions, useWorkbenchState } from "../hooks";

/**
 * The sidebar frame. Shows the contributed panel whose id matches the active
 * panel, with a drag-to-resize handle. Collapses when no panel is active.
 */
export function Sidebar() {
  const kernel = useKernel();
  const { activePanelId, sidebarWidth } = useWorkbenchState();
  const panels = useSlotContributions("sidebar.panel");

  const startX = useRef(0);
  const startW = useRef(0);
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      startX.current = e.clientX;
      startW.current = sidebarWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX.current;
        kernel.workbench.setSidebarWidth(
          Math.max(160, Math.min(480, startW.current + delta)),
        );
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarWidth, kernel],
  );

  const panel = activePanelId
    ? panels.find((p) => p.id === activePanelId)
    : undefined;
  if (!panel) return null;

  return (
    <div
      className="relative flex flex-col shrink-0 bg-bg-elevated border-r border-border overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {panel.render()}
      <div
        className="absolute top-0 -right-[2px] w-1 h-full cursor-col-resize z-10 hover:bg-accent hover:opacity-40 active:bg-accent active:opacity-40"
        onMouseDown={onMouseDown}
      />
    </div>
  );
}
