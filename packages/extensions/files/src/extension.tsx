import type { DirEntry, Extension, ExtensionContext, PaletteItem } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { fuzzyMatch } from "@jelly/ui";
import { FileTree } from "./ui/FileTree";
import { WorkspaceTitle } from "./ui/WorkspaceTitle";
import { useWorkspaceStore } from "./store";

function flattenFiles(entries: DirEntry[]): DirEntry[] {
  const out: DirEntry[] = [];
  for (const e of entries) {
    if (!e.isDir) out.push(e);
    if (e.children) out.push(...flattenFiles(e.children));
  }
  return out;
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
        { id: "workspace.getPath", title: "Get Workspace Path", palette: false },
        { id: "files.list", title: "List Files", palette: false },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useWorkspaceStore;

    ctx.subscriptions.push(
      // Open a folder as the workspace, then announce it. The kernel flips to
      // the editor workbench on this event; git/terminal react to it too.
      ctx.commands.register("workspace.open", async (path: string) => {
        const tree = await ipc.workspace.open(path);
        store.getState().setWorkspace(path, tree);
        ctx.events.emit("workspace:opened", { path });
      }),
      ctx.commands.register("workspace.getPath", () => store.getState().path),
      ctx.commands.register("files.list", () => flattenFiles(store.getState().tree)),

      // "Go to File" — the default (prefix-less) palette source.
      ctx.palette.registerProvider({
        id: "files",
        placeholder: "Search files by name…",
        getItems: (q): PaletteItem[] => {
          const { tree, path } = store.getState();
          const root = path ? path + "/" : "";
          return flattenFiles(tree)
            .filter((f) => fuzzyMatch(q, f.name) || fuzzyMatch(q, f.path))
            .map((f) => ({
              id: f.path,
              label: f.name,
              detail: f.path.startsWith(root) ? f.path.slice(root.length) : f.path,
              onAccept: () => void ctx.commands.execute("editor.open", f.path, f.name).catch(() => {}),
            }));
        },
      }),
    );

    // Keep the tree highlight in sync with the editor's active file.
    ctx.subscriptions.push(
      ctx.events.on<{ path: string | null }>("editor:active_changed", ({ path }) =>
        store.getState().setActiveFilePath(path),
      ),
    );

    ctx.ui.contributeActivityBarItem({
      id: "files",
      order: 10,
      title: "Files",
      icon: () => <FolderIcon />,
    });
    ctx.ui.contributeSidebarPanel({ id: "files", render: () => <FileTree ctx={ctx} /> });
    ctx.ui.mountSlot("titlebar", <WorkspaceTitle />, { id: "files.title" });
  },
};
