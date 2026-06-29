import type { ExtensionContext } from "@jelly/sdk";
import { type Pane, useEditorStore } from "../../store";
import { CodeEditor } from "../CodeEditor";
import { DiffView } from "../DiffView";
import type { BeginDrag } from "./drag";
import { TabBar } from "./TabBar";

export interface PaneProps {
  ctx: ExtensionContext;
  theme: "dark" | "light";
  beginDrag: BeginDrag;
}

function LargeFileBanner() {
  return (
    <div className="flex items-center gap-3 px-3 h-[30px] bg-warning/15 border-b border-warning/30 text-[12px] text-text shrink-0">
      <span className="text-warning">Syntax highlighting disabled for large files.</span>
    </div>
  );
}

/** Mounts a contributed view (e.g. a terminal) by type into a pane. */
function ViewHost({ viewType, viewId, active }: { viewType: string; viewId: string; active: boolean }) {
  // Re-render when a renderer registers so a view opened before its owner
  // activated still mounts once the renderer arrives.
  useEditorStore((s) => s.viewVersion);
  const render = useEditorStore.getState().viewRenderers.get(viewType);
  return (
    <div className="relative h-full w-full">
      {render ? (
        render(viewId, { active })
      ) : (
        <div className="flex items-center justify-center h-full text-text-dim text-[12px]">{viewType} unavailable</div>
      )}
    </div>
  );
}

export function PaneView({ ctx, theme, beginDrag, pane }: PaneProps & { pane: Pane }) {
  const largeFiles = useEditorStore((s) => s.largeFiles);
  const updateBuffer = useEditorStore((s) => s.updateBuffer);
  const getContent = useEditorStore((s) => s.getContent);
  const setActivePane = useEditorStore((s) => s.setActivePane);
  const closeDiff = useEditorStore((s) => s.closeDiff);
  const revealTarget = useEditorStore((s) => s.revealTarget);
  const isActive = useEditorStore((s) => s.activePaneId === pane.id);
  const dragOver = useEditorStore((s) => (s.dragOver?.paneId === pane.id ? s.dragOver : null));

  const focusPane = () => {
    if (!isActive) setActivePane(pane.id);
  };

  const EDGE_INSET: Record<string, string> = {
    left: "left-0 top-0 w-1/2 h-full",
    right: "right-0 top-0 w-1/2 h-full",
    top: "left-0 top-0 w-full h-1/2",
    bottom: "left-0 bottom-0 w-full h-1/2",
  };
  const fileOverlay = dragOver ? (
    <div
      className={`pointer-events-none absolute z-[40] bg-accent/10 ring-2 ring-inset ring-accent/60 ${
        dragOver.side ? EDGE_INSET[dragOver.side] : "inset-0"
      }`}
    />
  ) : null;

  if (pane.activeDiff) {
    const diff = pane.activeDiff;
    const name = diff.path.split("/").pop() ?? diff.path;
    return (
      <div data-pane-id={pane.id} className={`relative flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-bg`} onMouseDown={focusPane}>
        {fileOverlay}
        <div className="flex items-center gap-2 h-[34px] px-3 bg-bg-elevated border-b border-border shrink-0">
          <span className="text-[12px] text-text">{name}</span>
          <span className="text-[11px] text-text-dim">HEAD ↔ Working Tree</span>
          <button
            className="ml-auto flex items-center justify-center w-[18px] h-[18px] rounded-[3px] text-text-muted text-[14px] leading-none hover:bg-bg-active hover:text-text"
            onClick={() => closeDiff(pane.id)}
            title="Close diff"
          >
            ×
          </button>
        </div>
        <DiffView key={diff.path} path={diff.path} workspace={diff.workspace} theme={theme} />
      </div>
    );
  }

  const activeTab = pane.tabs.find((t) => t.path === pane.activeTabPath);
  const isView = activeTab?.kind === "view";
  const value = activeTab && !isView ? getContent(activeTab.path) : undefined;
  const isLargeFile = activeTab && !isView ? largeFiles.has(activeTab.path) : false;

  const isTerminalPane = pane.tabs.length > 0 && pane.tabs.every((t) => t.kind === "view" && t.viewType === "terminal");
  const onNewTerminal = isTerminalPane ? () => void ctx.commands.execute("terminal.new") : undefined;

  return (
    <div data-pane-id={pane.id} className={`relative flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-bg`} onMouseDown={focusPane}>
      {fileOverlay}
      {pane.tabs.length > 0 && <TabBar pane={pane} beginDrag={beginDrag} onNewTerminal={onNewTerminal} />}
      {isLargeFile && <LargeFileBanner />}
      <div className="flex-1 overflow-hidden">
        {!activeTab ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-dim text-[12px]">
            <span>Open a file from the explorer</span>
          </div>
        ) : isView ? (
          <ViewHost viewType={activeTab.viewType!} viewId={activeTab.viewId!} active={isActive} />
        ) : value === undefined ? (
          <div className="flex items-center justify-center h-full text-text-dim text-[12px]">Loading…</div>
        ) : (
          <CodeEditor
            key={activeTab.path}
            ctx={ctx}
            path={activeTab.path}
            name={activeTab.name}
            value={value}
            theme={theme}
            isLargeFile={isLargeFile}
            revealLine={revealTarget?.path === activeTab.path ? revealTarget.line : undefined}
            revealNonce={revealTarget?.path === activeTab.path ? revealTarget.nonce : undefined}
            onChange={(v) => updateBuffer(activeTab.path, v)}
            onFocus={focusPane}
          />
        )}
      </div>
    </div>
  );
}
