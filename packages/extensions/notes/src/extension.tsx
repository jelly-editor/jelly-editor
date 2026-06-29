import type { Extension, ExtensionContext } from "@jelly/sdk";
import { getJellyDir } from "@jelly/ipc";
import { NotesPanel } from "./ui/NotesPanel";
import { useNotesStore, type Note } from "./store";

function NotesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function slugify(path: string): string {
  return path.replace(/^\//, "").replace(/\//g, "_");
}

export const notesExtension: Extension = {
  manifest: {
    id: "jelly.notes",
    name: "Notes",
    version: "1.0.0",
    contributes: {
      commands: [{ id: "notes.new", title: "New Note" }],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useNotesStore;

    let jellyDir: string | null = null;

    function notesDir(workspacePath: string): string {
      const base = jellyDir ?? "~/.jelly";
      return `${base}/notes/${slugify(workspacePath)}`;
    }

    async function loadNotes(workspacePath: string) {
      const saved = (await ctx.storage.get<Note[]>(`notes:${workspacePath}`)) ?? [];
      store.getState().setNotes(saved);
    }

    async function handleWorkspaceOpened(path: string) {
      if (!jellyDir) {
        jellyDir = await getJellyDir().catch(() => null);
      }
      store.getState().setWorkspacePath(path);
      store.getState().setNotes([]);
      await loadNotes(path);
    }

    ctx.subscriptions.push(
      ctx.commands.register("notes.new", () => {
        ctx.events.emit("notes:create_requested", {});
      }),

      ctx.events.on<{ path: string }>("workspace:opened", ({ path }) => {
        void handleWorkspaceOpened(path);
      }),

      ctx.events.on<{ path: string | null }>("editor:active_changed", ({ path }) => {
        store.getState().setActiveNotePath(path);
      }),
    );

    // Pick up current workspace if notes activated after it was opened.
    void Promise.resolve(ctx.commands.execute<string | null>("workspace.getPath"))
      .then((path) => {
        if (path) void handleWorkspaceOpened(path);
      })
      .catch(() => {});

    ctx.ui.contributeActivityBarItem({ id: "notes", order: 40, title: "Notes", icon: () => <NotesIcon /> });
    ctx.ui.contributeSidebarPanel({
      id: "notes",
      render: () => <NotesPanel ctx={ctx} notesDir={notesDir} />,
    });
  },
};
