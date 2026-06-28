import { useKernel } from "../kernel-context";
import { useActivityBarItems, useWorkbenchState } from "../hooks";

/**
 * The activity-bar rail. Renders contributed items (top/bottom groups). An item
 * with onSelect runs it; otherwise clicking toggles the sidebar panel of the
 * same id, and the item is highlighted while that panel is active.
 */
export function ActivityBar() {
  const kernel = useKernel();
  const items = useActivityBarItems();
  const { activePanelId } = useWorkbenchState();

  const top = items.filter((i) => (i.align ?? "top") === "top");
  const bottom = items.filter((i) => i.align === "bottom");

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
    <div className="flex flex-col justify-between w-[44px] py-[6px] bg-bg-elevated border-r border-border shrink-0">
      <div className="flex flex-col items-center gap-[2px]">{top.map(render)}</div>
      <div className="flex flex-col items-center gap-[2px]">{bottom.map(render)}</div>
    </div>
  );
}
