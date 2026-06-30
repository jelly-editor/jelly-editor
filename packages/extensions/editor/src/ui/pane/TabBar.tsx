import { ContextMenu, useContextMenu } from "@jelly/ui";
import { type Pane, useEditorStore } from "../../store";
import type { BeginDrag } from "./drag";

function PinIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z" />
    </svg>
  );
}

export function TabBar({ pane, beginDrag, onNewTerminal }: { pane: Pane; beginDrag: BeginDrag; onNewTerminal?: () => void }) {
  const pinTab = useEditorStore((s) => s.pinTab);
  const unpinTab = useEditorStore((s) => s.unpinTab);
  const requestClose = useEditorStore((s) => s.requestClose);
  const closeTab = useEditorStore((s) => s.closeTab);
  const splitTab = useEditorStore((s) => s.splitTab);
  const menu = useContextMenu<string>(); // data = tab path

  const menuTab = menu.state ? pane.tabs.find((t) => t.path === menu.state!.data) : null;

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
              {tab.isPinned ? (
                <span className="text-text-dim opacity-60">
                  <PinIcon />
                </span>
              ) : (
                <>
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
                </>
              )}
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
            menuTab?.isPinned
              ? { label: "Unpin Tab", onSelect: () => unpinTab(pane.id, menu.state!.data) }
              : { label: "Pin Tab", onSelect: () => pinTab(pane.id, menu.state!.data) },
            { type: "separator" },
            { label: "Split Right", onSelect: () => splitTab(pane.id, menu.state!.data, "right") },
            { label: "Split Down", onSelect: () => splitTab(pane.id, menu.state!.data, "down") },
            { type: "separator" },
            { label: "Close", onSelect: () => closeTab(pane.id, menu.state!.data) },
          ]}
        />
      )}
    </div>
  );
}
