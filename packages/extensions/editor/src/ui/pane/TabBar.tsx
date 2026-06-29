import { ContextMenu, useContextMenu } from "@jelly/ui";
import { type Pane, useEditorStore } from "../../store";
import type { BeginDrag } from "./drag";

export function TabBar({ pane, beginDrag, onNewTerminal }: { pane: Pane; beginDrag: BeginDrag; onNewTerminal?: () => void }) {
  const pinTab = useEditorStore((s) => s.pinTab);
  const requestClose = useEditorStore((s) => s.requestClose);
  const splitTab = useEditorStore((s) => s.splitTab);
  const menu = useContextMenu<string>(); // data = tab path

  return (
    <div data-tabbar={pane.id} className="flex items-center bg-bg-elevated border-b border-border overflow-x-auto shrink-0">
      {pane.tabs.map((tab) => {
        const isActive = tab.path === pane.activeTabPath && !pane.activeDiff;
        return (
          <div
            key={tab.path}
            className={`group flex items-center gap-[6px] px-[12px] h-[34px] border-r border-border cursor-pointer text-[12px] whitespace-nowrap transition-colors duration-[80ms] select-none hover:bg-bg-hover hover:text-text ${
              isActive ? "bg-bg text-text" : "text-text-muted"
            } ${tab.isPreview ? "italic" : ""}`}
            onPointerDown={(e) => beginDrag(e, { fromPaneId: pane.id, path: tab.path, name: tab.name })}
            onDoubleClick={() => pinTab(pane.id, tab.path)}
            onContextMenu={(e) => menu.open(e, tab.path)}
            title={tab.path}
          >
            <span className="flex-1">{tab.name}</span>
            <span className="relative flex items-center justify-center w-[15px] h-[15px] shrink-0">
              {tab.isDirty && (
                <span className="w-[7px] h-[7px] rounded-full bg-accent group-hover:opacity-0" />
              )}
              <button
                className={`absolute inset-0 flex items-center justify-center p-0 bg-transparent text-text-muted text-[14px] leading-none cursor-pointer rounded-[3px] transition-[opacity,background] duration-[80ms] hover:bg-bg-active hover:text-text opacity-0 group-hover:opacity-100 ${
                  isActive && !tab.isDirty ? "opacity-100" : ""
                }`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  requestClose(pane.id, tab.path);
                }}
                title="Close"
              >
                ×
              </button>
            </span>
          </div>
        );
      })}
      {onNewTerminal && (
        <button
          className="flex items-center justify-center w-[28px] h-[34px] shrink-0 text-text-muted text-[16px] leading-none hover:text-text transition-colors duration-[80ms] cursor-pointer bg-transparent border-r border-border"
          onClick={onNewTerminal}
          title="New Terminal"
        >
          +
        </button>
      )}
      {menu.state && (
        <ContextMenu
          x={menu.state.x}
          y={menu.state.y}
          onClose={menu.close}
          items={[
            { label: "Split Right", onSelect: () => splitTab(pane.id, menu.state!.data, "right") },
            { label: "Split Down", onSelect: () => splitTab(pane.id, menu.state!.data, "down") },
            { type: "separator" },
            { label: "Close", onSelect: () => requestClose(pane.id, menu.state!.data) },
          ]}
        />
      )}
    </div>
  );
}
