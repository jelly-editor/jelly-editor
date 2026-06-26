import type { ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { useEffect, useState } from "react";
import { refreshGitStatus } from "../refresh";
import { useGitStore, type FileStatus, type GitFile } from "../store";

const { stage: gitStage, unstage: gitUnstage, commit: gitCommit } = ipc.git;

const BADGE: Record<FileStatus, { letter: string; cls: string }> = {
  modified: { letter: "M", cls: "text-warning" },
  added: { letter: "A", cls: "text-success" },
  deleted: { letter: "D", cls: "text-danger" },
  renamed: { letter: "R", cls: "text-accent" },
  untracked: { letter: "U", cls: "text-success" },
};

function FileRow({
  file,
  staged,
  onAction,
  onOpenDiff,
}: {
  file: GitFile;
  staged: boolean;
  onAction: (file: GitFile) => void;
  onOpenDiff: (file: GitFile) => void;
}) {
  const activeDiffPath = useGitStore((s) => s.activeDiffPath);
  const isActive = activeDiffPath === file.path;
  const name = file.path.split("/").pop() ?? file.path;
  const dir = file.path.slice(0, file.path.length - name.length - 1);
  const badge = BADGE[file.status];

  return (
    <div
      className={`group flex items-center gap-2 h-[24px] pl-3 pr-2 cursor-pointer text-[13px] hover:bg-bg-hover ${
        isActive ? "bg-bg-active text-text" : "text-text-muted"
      }`}
      onClick={() => onOpenDiff(file)}
      title={file.path}
    >
      <span className="flex-1 flex items-baseline gap-[6px] truncate">
        <span className="text-text truncate">{name}</span>
        {dir && <span className="text-[11px] text-text-dim truncate">{dir}</span>}
      </span>
      <button
        className="flex items-center justify-center w-[18px] h-[18px] rounded-[3px] text-text-muted opacity-0 group-hover:opacity-100 hover:bg-bg-active hover:text-text"
        onClick={(e) => {
          e.stopPropagation();
          onAction(file);
        }}
        title={staged ? "Unstage" : "Stage"}
      >
        {staged ? "−" : "+"}
      </button>
      <span className={`w-[12px] text-center text-[11px] font-semibold ${badge.cls}`}>
        {badge.letter}
      </span>
    </div>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: { label: string; onClick: () => void; title: string };
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-col">
      <div className="group flex items-center justify-between pl-3 pr-2 h-[24px]">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.08em]">
          {title}
        </span>
        <div className="flex items-center gap-1">
          {action && (
            <button
              className="text-[14px] leading-none text-text-muted opacity-0 group-hover:opacity-100 hover:text-text cursor-pointer px-1"
              onClick={action.onClick}
              title={action.title}
            >
              {action.label}
            </button>
          )}
          <span className="text-[10px] text-text-dim tabular-nums">{count}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function GitPanel({ ctx }: { ctx: ExtensionContext }) {
  const { branch, staged, modified, untracked, isRepo, workspacePath } = useGitStore();
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    refreshGitStatus();
  }, []);

  const unstagedFiles = [...modified, ...untracked];

  function openDiff(file: GitFile) {
    if (!workspacePath) return;
    void ctx.commands.execute("editor.openDiff", { path: file.path, workspace: workspacePath });
  }
  async function stage(file: GitFile) {
    if (!workspacePath) return;
    await gitStage(workspacePath, file.path).catch(() => {});
    refreshGitStatus();
  }
  async function unstage(file: GitFile) {
    if (!workspacePath) return;
    await gitUnstage(workspacePath, file.path).catch(() => {});
    refreshGitStatus();
  }
  async function stageAll() {
    if (!workspacePath) return;
    await Promise.all(unstagedFiles.map((f) => gitStage(workspacePath, f.path).catch(() => {})));
    refreshGitStatus();
  }
  async function unstageAll() {
    if (!workspacePath) return;
    await Promise.all(staged.map((f) => gitUnstage(workspacePath, f.path).catch(() => {})));
    refreshGitStatus();
  }
  async function commit() {
    if (!workspacePath || !message.trim() || staged.length === 0) return;
    setCommitting(true);
    try {
      await gitCommit(workspacePath, message.trim());
      setMessage("");
      refreshGitStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setCommitting(false);
    }
  }

  const canCommit = staged.length > 0 && message.trim().length > 0 && !committing;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center pl-3 pr-2 h-[34px] border-b border-border shrink-0">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em]">
          Source Control
        </span>
        {isRepo && branch && (
          <span className="ml-auto flex items-center gap-[5px] text-[11px] text-text-muted">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            {branch}
          </span>
        )}
      </div>

      {!isRepo ? (
        <div className="px-3 py-4 text-[11px] text-text-dim">Not a git repository</div>
      ) : (
        <>
          <div className="flex flex-col gap-2 p-2 border-b border-border shrink-0">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") commit();
              }}
              placeholder={`Message (⌘Enter to commit on ${branch || "HEAD"})`}
              rows={2}
              className="w-full resize-none bg-bg border border-border rounded-[5px] px-2 py-[6px] text-[12px] text-text placeholder:text-text-dim outline-none focus:border-accent"
              spellCheck={false}
            />
            <button
              className="w-full h-[28px] rounded-[5px] bg-accent text-accent-fg text-[12px] font-medium cursor-pointer transition-opacity hover:opacity-[0.86] disabled:opacity-40 disabled:cursor-default"
              onClick={commit}
              disabled={!canCommit}
            >
              {committing ? "Committing…" : `Commit${staged.length ? ` (${staged.length})` : ""}`}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            <Section
              title="Staged Changes"
              count={staged.length}
              action={{ label: "−", onClick: unstageAll, title: "Unstage all" }}
            >
              {staged.map((f) => (
                <FileRow key={`s:${f.path}`} file={f} staged onAction={unstage} onOpenDiff={openDiff} />
              ))}
            </Section>

            <Section
              title="Changes"
              count={unstagedFiles.length}
              action={{ label: "+", onClick: stageAll, title: "Stage all" }}
            >
              {unstagedFiles.map((f) => (
                <FileRow key={`u:${f.path}`} file={f} staged={false} onAction={stage} onOpenDiff={openDiff} />
              ))}
            </Section>

            {staged.length === 0 && unstagedFiles.length === 0 && (
              <div className="px-3 py-4 text-[11px] text-text-dim">No changes</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
