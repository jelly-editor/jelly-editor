import type { ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { useSetting } from "@jelly/ui";
import { useEffect, useState } from "react";
import { useEditorStore } from "../store";
import { CodeEditor } from "./CodeEditor";
import { DiffView } from "./DiffView";

const { save: saveFile, read: readFile } = ipc.fs;

/** Save a specific tab's buffer to disk. */
async function saveTab(path: string) {
  const ed = useEditorStore.getState();
  const content = ed.getContent(path);
  if (content === undefined) return;
  try {
    await saveFile(path, content);
    ed.setSaved(path, content);
  } catch {
    /* ignore — surfaced elsewhere */
  }
}

function saveActive() {
  const path = useEditorStore.getState().activeTabPath;
  if (path) saveTab(path);
}

function TabBar({ onRequestClose }: { onRequestClose: (path: string) => void }) {
  const { tabs, activeTabPath, setActiveTab, pinTab, setActiveDiff } = useEditorStore();

  const focusTab = (path: string) => {
    setActiveDiff(null); // leaving the diff view
    setActiveTab(path);
  };

  return (
    <div className="flex items-center bg-bg-elevated border-b border-border overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        return (
          <div
            key={tab.path}
            className={`group flex items-center gap-[6px] px-[12px] h-[34px] border-r border-border cursor-pointer text-[12px] whitespace-nowrap transition-colors duration-[80ms] select-none hover:bg-bg-hover hover:text-text ${
              isActive ? "bg-bg text-text" : "text-text-muted"
            } ${tab.isPreview ? "italic" : ""}`}
            onClick={() => focusTab(tab.path)}
            onDoubleClick={() => pinTab(tab.path)}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestClose(tab.path);
                }}
                title="Close"
              >
                ×
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LargeFileBanner() {
  return (
    <div className="flex items-center gap-3 px-3 h-[30px] bg-warning/15 border-b border-warning/30 text-[12px] text-text shrink-0">
      <span className="text-warning">Syntax highlighting disabled for large files.</span>
    </div>
  );
}

function ReloadBanner({ path }: { path: string }) {
  const { setSaved, clearExternalChange } = useEditorStore();

  async function reload() {
    try {
      const content = await readFile(path);
      setSaved(path, content);
    } catch {
      clearExternalChange(path);
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 h-[30px] bg-warning/15 border-b border-warning/30 text-[12px] text-text shrink-0">
      <span className="text-warning">This file changed on disk.</span>
      <button
        className="px-2 h-[20px] rounded-[4px] bg-bg-active text-text cursor-pointer hover:bg-bg-hover"
        onClick={reload}
      >
        Reload
      </button>
      <button
        className="px-2 h-[20px] rounded-[4px] bg-transparent text-text-muted cursor-pointer hover:text-text"
        onClick={() => clearExternalChange(path)}
      >
        Keep mine
      </button>
    </div>
  );
}

function UnsavedDialog({
  name,
  onSave,
  onDiscard,
  onCancel,
}: {
  name: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter") onSave();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onSave]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 animate-[fadeIn_80ms_ease]"
      onClick={onCancel}
    >
      <div
        className="flex flex-col gap-4 w-[360px] p-5 bg-bg-elevated border border-border rounded-[10px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-[6px]">
          <span className="text-[13px] font-semibold text-text">Save changes?</span>
          <span className="text-[12px] text-text-muted leading-relaxed">
            Do you want to save the changes you made to{" "}
            <span className="text-text font-medium">{name}</span>? Your changes will be
            lost if you don't save them.
          </span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            className="px-3 h-[28px] rounded-[5px] bg-transparent text-text-muted text-[12px] cursor-pointer hover:bg-bg-hover hover:text-text"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 h-[28px] rounded-[5px] bg-transparent text-danger text-[12px] cursor-pointer hover:bg-danger/15"
            onClick={onDiscard}
          >
            Don't Save
          </button>
          <button
            className="px-3 h-[28px] rounded-[5px] bg-accent text-accent-fg text-[12px] font-medium cursor-pointer hover:opacity-[0.86]"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditorPane({ ctx }: { ctx: ExtensionContext }) {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabPath = useEditorStore((s) => s.activeTabPath);
  const externallyChanged = useEditorStore((s) => s.externallyChanged);
  const largeFiles = useEditorStore((s) => s.largeFiles);
  const updateBuffer = useEditorStore((s) => s.updateBuffer);
  const getContent = useEditorStore((s) => s.getContent);
  const closeTab = useEditorStore((s) => s.closeTab);
  const activeDiff = useEditorStore((s) => s.activeDiff);
  const setActiveDiff = useEditorStore((s) => s.setActiveDiff);
  const revealTarget = useEditorStore((s) => s.revealTarget);
  const theme = useSetting(ctx, "ui.theme", "dark") as "dark" | "light";
  const [closing, setClosing] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveActive();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
        e.preventDefault();
        const { activeTabPath, tabs, closeTab } = useEditorStore.getState();
        if (!activeTabPath) return;
        const tab = tabs.find((t) => t.path === activeTabPath);
        if (tab?.isDirty) setClosing(activeTabPath);
        else closeTab(activeTabPath);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function requestClose(path: string) {
    const tab = useEditorStore.getState().tabs.find((t) => t.path === path);
    if (tab?.isDirty) setClosing(path);
    else closeTab(path);
  }

  const closingTab = closing ? tabs.find((t) => t.path === closing) : undefined;
  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const value = activeTabPath ? getContent(activeTabPath) : undefined;
  const showBanner = activeTabPath ? externallyChanged.has(activeTabPath) : false;
  const isLargeFile = activeTabPath ? largeFiles.has(activeTabPath) : false;

  if (activeDiff) {
    const name = activeDiff.path.split("/").pop() ?? activeDiff.path;
    return (
      <div className="flex flex-col flex-1 overflow-hidden bg-bg">
        <div className="flex items-center gap-2 h-[34px] px-3 bg-bg-elevated border-b border-border shrink-0">
          <span className="text-[12px] text-text">{name}</span>
          <span className="text-[11px] text-text-dim">HEAD ↔ Working Tree</span>
          <button
            className="ml-auto flex items-center justify-center w-[18px] h-[18px] rounded-[3px] text-text-muted text-[14px] leading-none hover:bg-bg-active hover:text-text"
            onClick={() => setActiveDiff(null)}
            title="Close diff"
          >
            ×
          </button>
        </div>
        <DiffView key={activeDiff.path} path={activeDiff.path} workspace={activeDiff.workspace} theme={theme} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-bg">
      {tabs.length > 0 && <TabBar onRequestClose={requestClose} />}
      {showBanner && activeTabPath && <ReloadBanner path={activeTabPath} />}
      {isLargeFile && <LargeFileBanner />}
      <div className="flex-1 overflow-hidden">
        {!activeTab ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-dim text-[12px]">
            <span>Open a file from the explorer</span>
          </div>
        ) : value === undefined ? (
          <div className="flex items-center justify-center h-full text-text-dim text-[12px]">
            Loading…
          </div>
        ) : (
          <CodeEditor
            key={activeTabPath}
            ctx={ctx}
            name={activeTab.name}
            value={value}
            theme={theme}
            isLargeFile={isLargeFile}
            revealLine={revealTarget?.path === activeTabPath ? revealTarget.line : undefined}
            revealNonce={revealTarget?.path === activeTabPath ? revealTarget.nonce : undefined}
            onChange={(v) => activeTabPath && updateBuffer(activeTabPath, v)}
          />
        )}
      </div>

      {closing && closingTab && (
        <UnsavedDialog
          name={closingTab.name}
          onSave={async () => {
            const path = closing;
            setClosing(null);
            await saveTab(path);
            closeTab(path);
          }}
          onDiscard={() => {
            closeTab(closing);
            setClosing(null);
          }}
          onCancel={() => setClosing(null)}
        />
      )}
    </div>
  );
}
