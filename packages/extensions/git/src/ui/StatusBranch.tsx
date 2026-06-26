import type { ExtensionContext } from "@jelly/sdk";
import { useGitStore } from "../store";

/** Branch + change count in the status bar; clicking toggles the git panel. */
export function StatusBranch({ ctx }: { ctx: ExtensionContext }) {
  const branch = useGitStore((s) => s.branch);
  const isRepo = useGitStore((s) => s.isRepo);
  const changeCount = useGitStore(
    (s) => s.staged.length + s.modified.length + s.untracked.length,
  );

  if (!isRepo || !branch) return null;

  return (
    <button
      className="flex items-center gap-[5px] px-1 h-full bg-transparent text-text-muted cursor-pointer rounded-[3px] hover:bg-bg-hover hover:text-text"
      onClick={() => void ctx.commands.execute("workbench.togglePanel", "git")}
      title="Source Control"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </svg>
      {branch}
      {changeCount > 0 && <span className="text-text-dim">{changeCount}</span>}
    </button>
  );
}
