import { useCallback, useEffect, useRef, useState } from "react";
import { useKernel } from "../kernel-context";
import { useSlotContributions, useWorkbenchState } from "../hooks";

function SidebarContextMenu({
  x,
  y,
  position,
  onMove,
  onClose,
}: {
  x: number;
  y: number;
  position: "left" | "right";
  onMove: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[600] min-w-[180px] bg-bg-elevated border border-border rounded-[7px] shadow-2xl py-1 text-[13px]"
      style={{ left: x, top: y }}
    >
      <button
        className="flex w-full items-center px-3 h-[28px] text-left text-text-muted hover:bg-bg-active hover:text-text"
        onClick={() => { onMove(); onClose(); }}
      >
        Move Sidebar to {position === "left" ? "Right" : "Left"}
      </button>
    </div>
  );
}

export function Sidebar() {
  const kernel = useKernel();
  const { activePanelId, sidebarWidth, sidebarPosition } = useWorkbenchState();
  const panels = useSlotContributions("sidebar.panel");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const startX = useRef(0);
  const startW = useRef(0);
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      startX.current = e.clientX;
      startW.current = sidebarWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = sidebarPosition === "right"
          ? startX.current - ev.clientX
          : ev.clientX - startX.current;
        kernel.workbench.setSidebarWidth(Math.max(160, Math.min(480, startW.current + delta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarWidth, sidebarPosition, kernel],
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const panel = activePanelId ? panels.find((p) => p.id === activePanelId) : undefined;
  if (!panel) return null;

  const right = sidebarPosition === "right";

  return (
    <>
      <div
        className={`relative flex flex-col shrink-0 bg-bg-elevated overflow-hidden ${right ? "border-l border-border" : "border-r border-border"}`}
        style={{ width: sidebarWidth }}
        onContextMenu={onContextMenu}
      >
        {panel.render()}
        <div
          className={`absolute top-0 w-1 h-full cursor-col-resize z-10 hover:bg-accent hover:opacity-40 active:bg-accent active:opacity-40 ${right ? "-left-[2px]" : "-right-[2px]"}`}
          onMouseDown={onMouseDown}
        />
      </div>
      {menu && (
        <SidebarContextMenu
          x={menu.x}
          y={menu.y}
          position={sidebarPosition}
          onMove={() => kernel.settings.set("ui.sidebarPosition", sidebarPosition === "left" ? "right" : "left")}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
