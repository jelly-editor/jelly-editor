import type { DirEntry, Extension, ExtensionContext, PaletteItem } from "@jelly/sdk";
import { ipc, pickFolder } from "@jelly/ipc";
import { fuzzyScore } from "@jelly/ui";
import { FileTree } from "./ui/FileTree";
import { FolderSwitcher } from "./ui/FolderSwitcher";
import { WorkspaceTitle } from "./ui/WorkspaceTitle";
import { useWorkspaceStore } from "./store";

interface SavedWorkspace {
  id: string;
  folders: string[];
  name: string;
  lastOpened: number;
}

function flattenFiles(entries: DirEntry[]): DirEntry[] {
  const out: DirEntry[] = [];
  for (const e of entries) {
    if (!e.isDir) out.push(e);
    if (e.children) out.push(...flattenFiles(e.children));
  }
  return out;
}

/** Whether `dir`'s children are already loaded into the tree (root counts). */
function isDirLoaded(nodes: DirEntry[], root: string, dir: string): boolean {
  if (dir === root) return true;
  for (const n of nodes) {
    if (n.path === dir) return n.children !== undefined;
    if (n.isDir && n.children && dir.startsWith(n.path + "/")) {
      return isDirLoaded(n.children, root, dir);
    }
  }
  return false;
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export const filesExtension: Extension = {
  manifest: {
    id: "jelly.files",
    name: "Files",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "workspace.open", title: "Open Folder" },
        { id: "workspace.openFolder", title: "Open Folder", palette: false },
        { id: "workspace.addFolder", title: "Add Folder to Workspace" },
        { id: "workspace.switchFolder", title: "Switch Folder", palette: false },
        { id: "workspace.openWorkspace", title: "Open Workspace", palette: false },
        { id: "workspace.listSaved", title: "List Saved Workspaces", palette: false },
        { id: "workspace.removeFolder", title: "Remove Folder from Workspace", palette: false },
        { id: "workspace.removeSaved", title: "Remove Saved Workspace", palette: false },
        { id: "workspace.getPath", title: "Get Workspace Path", palette: false },
        { id: "files.list", title: "List Files", palette: false },
        { id: "files.refresh", title: "Refresh Explorer", palette: false },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useWorkspaceStore;

    // ── Saved workspace helpers ────────────────────────────────────────────

    async function getSaved(): Promise<SavedWorkspace[]> {
      return (await ctx.storage.get<SavedWorkspace[]>("savedWorkspaces")) ?? [];
    }

    async function upsertSaved(folders: string[]): Promise<void> {
      const saved = await getSaved();
      const key = [...folders].sort().join("\n");
      const existing = saved.find((w) => [...w.folders].sort().join("\n") === key);
      if (existing) {
        existing.lastOpened = Date.now();
        existing.folders = folders;
      } else {
        saved.push({
          id: crypto.randomUUID(),
          folders,
          name: folders.map((f) => f.split("/").pop() ?? f).join(", "),
          lastOpened: Date.now(),
        });
      }
      await ctx.storage.set("savedWorkspaces", saved);
    }

    // ── File tree helpers ──────────────────────────────────────────────────

    const loadAllFiles = (root: string) => {
      ipc.fs
        .listFiles(root)
        .then((files) => {
          if (store.getState().path === root) store.getState().setAllFiles(files);
        })
        .catch(() => {});
    };

    const restoreExpanded = async (root: string) => {
      const dirs = (await ctx.storage.get<string[]>(`expanded:${root}`)) ?? [];
      dirs.sort((a, b) => a.split("/").length - b.split("/").length);
      for (const dir of dirs) {
        try {
          store.getState().setChildren(dir, await ipc.fs.list(dir));
          store.getState().setExpanded(dir, true);
        } catch {
          /* folder no longer exists */
        }
      }
    };

    // ── Commands ───────────────────────────────────────────────────────────

    ctx.subscriptions.push(
      ctx.commands.register("workspace.open", async (path: string) => {
        const tree = await ipc.workspace.open(path);
        store.getState().setWorkspace(path, tree);
        ctx.events.emit("workspace:opened", { path });
        loadAllFiles(path);
        void restoreExpanded(path);
      }),

      ctx.commands.register("workspace.openFolder", async () => {
        const path = await pickFolder();
        if (path) await ctx.commands.execute("workspace.open", path);
      }),

      ctx.commands.register("workspace.addFolder", async () => {
        const path = await pickFolder();
        if (!path || store.getState().folders.includes(path)) return;
        store.getState().addFolder(path);
      }),

      ctx.commands.register("workspace.switchFolder", (path: string) => {
        if (store.getState().path === path) return;
        return ctx.commands.execute("workspace.open", path);
      }),

      ctx.commands.register("workspace.removeFolder", async (path: string) => {
        const { folders, path: active } = store.getState();
        if (folders.length <= 1) return;
        store.getState().removeFolder(path);
        if (active === path) {
          const next = store.getState().folders[0];
          if (next) await ctx.commands.execute("workspace.open", next);
        }
      }),

      ctx.commands.register("workspace.openWorkspace", async (id: string) => {
        const saved = await getSaved();
        const ws = saved.find((w) => w.id === id);
        if (!ws || !ws.folders.length) return;
        await ctx.commands.execute("workspace.open", ws.folders[0]);
        if (ws.folders.length > 1) store.getState().setFolders(ws.folders);
        ws.lastOpened = Date.now();
        await ctx.storage.set("savedWorkspaces", saved);
      }),

      ctx.commands.register("workspace.listSaved", () => getSaved()),

      ctx.commands.register("workspace.removeSaved", async (id: string) => {
        const saved = await getSaved();
        await ctx.storage.set("savedWorkspaces", saved.filter((w) => w.id !== id));
      }),

      ctx.commands.register("workspace.getPath", () => store.getState().path),
      ctx.commands.register("files.list", () => flattenFiles(store.getState().tree)),
      ctx.commands.register("files.refresh", async (dir?: string) => {
        const root = store.getState().path;
        if (!root) return;
        const children = await ipc.fs.list(dir ?? root);
        store.getState().setChildren(dir ?? root, children);
      }),

      // "Go to File" — the default (prefix-less) palette source.
      ctx.palette.registerProvider({
        id: "files",
        placeholder: "Search files by name…",
        getItems: (q): PaletteItem[] => {
          const { tree, allFiles, path } = store.getState();
          const root = path ? path + "/" : "";
          const files = allFiles.length ? allFiles : flattenFiles(tree);
          return files
            .map((f) => ({ f, score: fuzzyScore(q, f.name) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ f }) => ({
              id: f.path,
              label: f.name,
              detail: f.path.startsWith(root) ? f.path.slice(root.length) : f.path,
              onAccept: () => void ctx.commands.execute("editor.open", f.path, f.name).catch(() => {}),
            }));
        },
      }),
    );

    // ── Restore folder list on first workspace:opened ──────────────────────

    let foldersInitialized = false;
    ctx.subscriptions.push(
      ctx.events.on<{ path: string }>("workspace:opened", async ({ path }) => {
        if (foldersInitialized) return;
        foldersInitialized = true;
        const saved = (await ctx.storage.get<string[]>("workspace.folders")) ?? [];
        const others = saved.filter((f) => f !== path);
        if (others.length > 0) store.getState().setFolders([path, ...others]);
      }),
    );

    // ── Persist folder list + auto-save multi-folder workspaces ───────────

    let prevFolders = store.getState().folders;
    ctx.subscriptions.push({
      dispose: store.subscribe((s) => {
        if (s.folders === prevFolders) return;
        prevFolders = s.folders;
        void ctx.storage.set("workspace.folders", s.folders);
        if (s.folders.length > 1) void upsertSaved(s.folders);
      }),
    });

    // ── Keep active file + git status in sync ─────────────────────────────

    const revealInTree = async (filePath: string) => {
      const root = store.getState().path;
      if (!root || !filePath.startsWith(root + "/")) return;
      const segments = filePath.slice(root.length + 1).split("/");
      segments.pop();
      let dir = root;
      for (const seg of segments) {
        dir = `${dir}/${seg}`;
        if (!isDirLoaded(store.getState().tree, root, dir)) {
          try {
            store.getState().setChildren(dir, await ipc.fs.list(dir));
          } catch {
            return;
          }
        }
        store.getState().setExpanded(dir, true);
      }
    };

    ctx.subscriptions.push(
      ctx.events.on<{ path: string | null }>("editor:active_changed", ({ path }) => {
        store.getState().setActiveFilePath(path);
        store.getState().clearSelection();
        if (path) void revealInTree(path);
      }),
      ctx.events.on<{ statuses: Record<string, import("@jelly/sdk").FileStatus> }>("git:status_changed", ({ statuses }) =>
        store.getState().setGitStatuses(statuses),
      ),
    );

    // ── Persist expanded dirs ─────────────────────────────────────────────

    let expandedTimer: ReturnType<typeof setTimeout> | undefined;
    let prevExpanded = store.getState().expandedDirs;
    ctx.subscriptions.push(
      { dispose: () => clearTimeout(expandedTimer) },
      {
        dispose: store.subscribe((s) => {
          if (s.expandedDirs === prevExpanded || !s.path) return;
          prevExpanded = s.expandedDirs;
          const root = s.path;
          clearTimeout(expandedTimer);
          expandedTimer = setTimeout(() => {
            void ctx.storage.set(`expanded:${root}`, [...store.getState().expandedDirs]);
          }, 300);
        }),
      },
    );

    // ── React to external file changes ────────────────────────────────────

    const pendingDirs = new Set<string>();
    let extTimer: ReturnType<typeof setTimeout> | undefined;
    const flushExternal = () => {
      const { path: root, tree } = store.getState();
      if (root) {
        for (const dir of pendingDirs) {
          if (isDirLoaded(tree, root, dir)) {
            ipc.fs
              .list(dir)
              .then((children) => store.getState().setChildren(dir, children))
              .catch(() => {});
          }
        }
        loadAllFiles(root);
      }
      pendingDirs.clear();
    };
    ctx.subscriptions.push(
      ctx.events.on<{ path: string }>("file:changed_externally", ({ path }) => {
        pendingDirs.add(path.slice(0, path.lastIndexOf("/")));
        clearTimeout(extTimer);
        extTimer = setTimeout(flushExternal, 150);
      }),
      { dispose: () => clearTimeout(extTimer) },
    );

    // ── UI contributions ──────────────────────────────────────────────────

    ctx.ui.contributeActivityBarItem({
      id: "files",
      order: 10,
      title: "Files",
      icon: () => <FolderIcon />,
    });
    ctx.ui.contributeSidebarPanel({ id: "files", render: () => <FileTree ctx={ctx} /> });
    ctx.ui.mountSlot("titlebar", <WorkspaceTitle ctx={ctx} />, { id: "files.title" });
    ctx.ui.mountSlot("folder-switcher", <FolderSwitcher ctx={ctx} />, { id: "files.folderSwitcher" });
  },
};
