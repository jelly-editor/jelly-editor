import { useCallback, useEffect, useRef, useState } from "react";
import { useKernel } from "../kernel-context";
import { useActivityBarItems, useWorkbenchState } from "../hooks";

function ActivityBarMenu({
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

/**
 * The activity-bar rail. Renders contributed items (top/bottom groups). An item
 * with onSelect runs it; otherwise clicking toggles the sidebar panel of the
 * same id, and the item is highlighted while that panel is active.
 */
export function ActivityBar() {
  const kernel = useKernel();
  const items = useActivityBarItems();
  const { activePanelId, sidebarPosition } = useWorkbenchState();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const top = items.filter((i) => (i.align ?? "top") === "top");
  const bottom = items.filter((i) => i.align === "bottom");

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const render = (item: (typeof items)[number]) => {
    const active = activePanelId === item.id;
    return (
      <button
        key={item.id}
        className={`relative flex items-center justify-center w-8 h-8 p-0 rounded-[5px] cursor-pointer transition-colors duration-[80ms] hover:text-text ${
          active ? "bg-bg-active text-text" : "bg-transparent text-text-muted"
        }`}
        onClick={() =>
          item.onSelect ? item.onSelect() : kernel.workbench.togglePanel(item.id)
        }
        title={item.title}
      >
        {item.icon()}
        {item.badge?.()}
      </button>
    );
  };

  return (
    <>
      <div
        className="flex flex-col justify-between w-[44px] py-[6px] bg-bg-elevated border-r border-border shrink-0"
        onContextMenu={onContextMenu}
      >
        <div className="flex flex-col items-center gap-[2px]">{top.map(render)}</div>
        <div className="flex flex-col items-center gap-[2px]">{bottom.map(render)}</div>
      </div>
      {menu && (
        <ActivityBarMenu
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
