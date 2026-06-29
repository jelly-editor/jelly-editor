import type { Extension, ExtensionContext, SearchDone, SearchFileResult } from "@jelly/sdk";
import { SearchPanel } from "./ui/SearchPanel";
import { useSearchStore } from "./store";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

export const searchExtension: Extension = {
  manifest: {
    id: "jelly.search",
    name: "Search",
    version: "1.0.0",
    contributes: {
      commands: [{ id: "search.focus", title: "Find in Files" }],
      keybindings: [{ command: "search.focus", key: "mod+shift+f" }],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useSearchStore;

    // Reveal the Search panel and pull focus into its query input.
    const focusSearch = () => {
      void ctx.commands.execute("workbench.showPanel", "search");
      store.getState().requestFocus();
    };

    // Pick up the current workspace (search may activate after it opened),
    // then track it via events.
    void Promise.resolve(ctx.commands.execute<string | null>("workspace.getPath"))
      .then((path) => store.getState().setWorkspacePath(path ?? null))
      .catch(() => {});

    ctx.subscriptions.push(
      ctx.commands.register("search.focus", focusSearch),
      ctx.events.on<{ path: string }>("workspace:opened", ({ path }) => {
        store.getState().setWorkspacePath(path);
      }),
      ctx.events.on<{ path: string }>("workspace:folder_changed", ({ path }) => {
        store.getState().setWorkspacePath(path);
      }),
      // Stream results from the Rust search actor into the store.
      ctx.events.on<SearchFileResult>("search:result", (r) => store.getState().addResult(r)),
      ctx.events.on<SearchDone>("search:done", ({ searchId, capped }) =>
        store.getState().finishSearch(searchId, capped),
      ),
    );

    ctx.ui.contributeActivityBarItem({
      id: "search",
      order: 15,
      title: "Search",
      icon: () => <SearchIcon />,
    });
    ctx.ui.contributeSidebarPanel({ id: "search", render: () => <SearchPanel ctx={ctx} /> });
  },
};
