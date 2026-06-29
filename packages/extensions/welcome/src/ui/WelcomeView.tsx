import type { ExtensionContext } from "@jelly/sdk";
import { ipc, pickFolder } from "@jelly/ipc";
import { useSetting } from "@jelly/ui";
import { useEffect, useState } from "react";

interface SavedWorkspace {
  id: string;
  folders: string[];
  name: string;
  lastOpened: number;
}

type Tab = "recent" | "workspaces";

/** The full-screen welcome surface: open a folder or pick a recent one. */
export function WelcomeView({ ctx }: { ctx: ExtensionContext }) {
  const theme = useSetting(ctx, "ui.theme", "dark");
  const [tab, setTab] = useState<Tab>("recent");
  const [recents, setRecents] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<SavedWorkspace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ipc.workspace.recent().then(setRecents).catch(() => {});
    ctx.commands
      .execute<SavedWorkspace[]>("workspace.listSaved")
      .then((ws) => setWorkspaces((ws ?? []).sort((a, b) => b.lastOpened - a.lastOpened)))
      .catch(() => {});
  }, []);

  async function openFolder(path: string) {
    setLoading(true);
    try {
      await ctx.commands.execute("workspace.open", path);
    } catch {
      await ipc.workspace.removeRecent(path).catch(() => {});
      setRecents((r) => r.filter((f) => f !== path));
    } finally {
      setLoading(false);
    }
  }

  async function openWorkspace(id: string) {
    setLoading(true);
    try {
      await ctx.commands.execute("workspace.openWorkspace", id);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    const path = await pickFolder();
    if (path) await openFolder(path);
  }

  async function handleRemoveRecent(e: React.MouseEvent, path: string) {
    e.stopPropagation();
    await ipc.workspace.removeRecent(path).catch(() => {});
    setRecents((r) => r.filter((f) => f !== path));
  }

  async function handleRemoveWorkspace(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await ctx.commands.execute("workspace.removeSaved", id).catch(() => {});
    setWorkspaces((ws) => ws.filter((w) => w.id !== id));
  }

  const formatPath = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");
  const folderName = (p: string) => p.split("/").pop() ?? p;

  return (
    <div className="relative flex items-center justify-center h-full pt-[38px]">
      <div
        className="fixed top-0 left-0 right-0 h-[38px] z-[100] bg-bg-elevated border-b border-border [-webkit-app-region:drag] [app-region:drag]"
        data-tauri-drag-region
      />
      <button
        className="absolute top-[14px] right-[14px] flex items-center justify-center w-7 h-7 p-0 rounded-[5px] bg-transparent text-text-muted cursor-pointer transition-colors duration-[80ms] hover:bg-bg-hover hover:text-text"
        onClick={() => void ctx.commands.execute("ui.toggleTheme")}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <div className="flex flex-col items-start gap-9 w-full max-w-[320px]">
        <div className="flex flex-col gap-[5px]">
          <img src="/jelly.svg" alt="jelly" className="w-[48px] h-[48px]" draggable={false} />
          <span className="text-[12px] text-text-muted">a minimal editor</span>
        </div>

        <button
          className="w-full py-[9px] bg-accent text-accent-fg rounded-[5px] text-[13px] font-medium cursor-pointer transition-opacity duration-[80ms] hover:opacity-[0.86] disabled:opacity-45 disabled:cursor-default"
          onClick={handleOpen}
          disabled={loading}
        >
          {loading ? "Opening…" : "Open Folder"}
        </button>

        <div className="w-full flex flex-col gap-[10px]">
          <div className="flex gap-[2px]">
            {(["recent", "workspaces"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`px-[8px] h-[22px] text-[10px] font-semibold uppercase tracking-[0.1em] rounded-[3px] cursor-pointer transition-colors duration-[80ms] ${
                  tab === t ? "bg-bg-active text-text" : "text-text-muted hover:text-text"
                }`}
                onClick={() => setTab(t)}
              >
                {t === "recent" ? "Folders" : "Workspaces"}
              </button>
            ))}
          </div>

          <div className="h-[264px]">
          {tab === "recent" && (
            recents.length === 0 ? (
              <span className="text-[12px] text-text-dim">No recent folders</span>
            ) : (
              <ul className="list-none flex flex-col gap-px">
                {recents.map((folder) => (
                  <li key={folder} className="group flex items-center rounded-[4px] hover:bg-bg-hover">
                    <button
                      className="flex-1 flex flex-col items-start gap-[2px] py-[7px] px-2 bg-transparent cursor-pointer text-left disabled:opacity-45 disabled:cursor-default"
                      onClick={() => openFolder(folder)}
                      disabled={loading}
                    >
                      <span className="text-[13px] text-text">{folderName(folder)}</span>
                      <span className="text-[11px] text-text-muted">{formatPath(folder)}</span>
                    </button>
                    <button
                      className="py-1 px-2 bg-transparent text-text-dim text-[14px] leading-none cursor-pointer opacity-0 transition-[opacity,color] duration-[80ms] group-hover:opacity-100 hover:text-danger"
                      onClick={(e) => handleRemoveRecent(e, folder)}
                      title="Remove from recents"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "workspaces" && (
            workspaces.length === 0 ? (
              <span className="text-[12px] text-text-dim">
                No saved workspaces yet. Add a second folder via the workspace title menu to create one.
              </span>
            ) : (
              <ul className="list-none flex flex-col gap-px">
                {workspaces.map((ws) => (
                  <li key={ws.id} className="group flex items-center rounded-[4px] hover:bg-bg-hover">
                    <button
                      className="flex-1 flex flex-col items-start gap-[2px] py-[7px] px-2 bg-transparent cursor-pointer text-left disabled:opacity-45 disabled:cursor-default"
                      onClick={() => openWorkspace(ws.id)}
                      disabled={loading}
                    >
                      <span className="text-[13px] text-text">{ws.name}</span>
                      <span className="text-[11px] text-text-muted">{ws.folders.length} folders</span>
                    </button>
                    <button
                      className="py-1 px-2 bg-transparent text-text-dim text-[14px] leading-none cursor-pointer opacity-0 transition-[opacity,color] duration-[80ms] group-hover:opacity-100 hover:text-danger"
                      onClick={(e) => handleRemoveWorkspace(e, ws.id)}
                      title="Remove workspace"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
          </div>
        </div>

        <div className="text-[11px] text-text-muted">
          <kbd className="inline-block py-[1px] px-[5px] border border-border rounded-[3px] text-[10px] text-text-muted">
            ⌘ Shift N
          </kbd>{" "}
          new window &nbsp;·&nbsp;{" "}
          <kbd className="inline-block py-[1px] px-[5px] border border-border rounded-[3px] text-[10px] text-text-muted">
            ⌘,
          </kbd>{" "}
          settings
        </div>
      </div>
    </div>
  );
}
