import type { Extension, ExtensionContext, FileStatus } from "@jelly/sdk";
import { GitPanel } from "./ui/GitPanel";
import { StatusBranch } from "./ui/StatusBranch";
import { createIgnoreWarningChecker } from "./ignoreWarning";
import { refreshGitStatus } from "./refresh";
import { useGitStore } from "./store";

function GitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

function GitBadge() {
  const count = useGitStore((s) => s.staged.length + s.modified.length + s.untracked.length);
  if (!count) return null;
  return (
    <span className="absolute -top-[3px] -right-[3px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-[3px] text-[9px] font-semibold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export const gitExtension: Extension = {
  manifest: {
    id: "jelly.git",
    name: "Git",
    version: "1.0.0",
    contributes: {
      commands: [{ id: "git.refresh", title: "Refresh Git Status" }],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useGitStore;

    // Debounce refreshes — file events can arrive in bursts.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refreshSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => refreshGitStatus(), 250);
    };

    // Pick up the current workspace (in case git activated after it opened),
    // then track it via events.
    void Promise.resolve(ctx.commands.execute<string | null>("workspace.getPath"))
      .then((path) => {
        if (path) {
          store.getState().setWorkspacePath(path);
          refreshGitStatus();
        }
      })
      .catch(() => {});

    const checkIgnoreWarning = createIgnoreWarningChecker(ctx);

    // Broadcast a path→status map (absolute paths) so the file tree can colour
    // entries by git status. Working-tree status wins over the staged one.
    let prevKey = "";
    const emitStatuses = () => {
      const s = store.getState();
      const ws = s.workspacePath;
      if (!ws) return;
      const statuses: Record<string, FileStatus> = {};
      for (const f of s.staged) statuses[`${ws}/${f.path}`] = f.status;
      for (const f of [...s.modified, ...s.untracked]) statuses[`${ws}/${f.path}`] = f.status;
      const key = JSON.stringify(statuses);
      if (key === prevKey) return;
      prevKey = key;
      ctx.events.emit("git:status_changed", { statuses });
    };

    ctx.subscriptions.push(
      { dispose: store.subscribe(checkIgnoreWarning) },
      { dispose: store.subscribe(emitStatuses) },
      ctx.commands.register("git.refresh", () => refreshGitStatus()),
      ctx.events.on<{ path: string }>("workspace:opened", ({ path }) => {
        store.getState().setWorkspacePath(path);
        refreshGitStatus();
      }),
      ctx.events.on("file:saved", refreshSoon),
      ctx.events.on("file:changed_externally", refreshSoon),
      ctx.events.on("git:changed", refreshSoon),
      ctx.events.on<{ path: string | null }>("editor:diff_changed", ({ path }) =>
        store.getState().setActiveDiffPath(path),
      ),
      { dispose: () => clearTimeout(timer) },
    );

    ctx.ui.contributeActivityBarItem({ id: "git", order: 20, title: "Git", icon: () => <GitIcon />, badge: () => <GitBadge /> });
    ctx.ui.contributeSidebarPanel({ id: "git", render: () => <GitPanel ctx={ctx} /> });
    ctx.ui.contributeStatusBarItem({
      id: "git.branch",
      align: "left",
      order: 10,
      render: () => <StatusBranch ctx={ctx} />,
    });
  },
};
