import type { ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { useEffect, useState } from "react";
import { refreshGitStatus } from "../refresh";
import { useGitStore, type FileStatus, type GitFile, type GitStash } from "../store";
import { ContextMenu, FileIcon, useContextMenu } from "@jelly/ui";
import { StashRow } from "./StashRow";

const { stage: gitStage, unstage: gitUnstage, discard: gitDiscard, commit: gitCommit, stash: gitStash, stashApply: gitStashApply, stashDrop: gitStashDrop, push: gitPush, pull: gitPull } = ipc.git;

function DiscardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M3 13a9 9 0 1 0 3-7.7L3 7" />
    </svg>
  );
}

const RENDER_LIMIT = 500;

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
  onDiscard,
  onOpenDiff,
}: {
  file: GitFile;
  staged: boolean;
  onAction: (file: GitFile) => void;
  onDiscard?: (file: GitFile) => void;
  onOpenDiff: (file: GitFile) => void;
}) {
  const activeDiffPath = useGitStore((s) => s.activeDiffPath);
  const isActive = activeDiffPath === file.path;
  const lastSlashIndex = file.path.lastIndexOf("/");
  const name = lastSlashIndex !== -1 ? file.path.slice(lastSlashIndex + 1) : file.path;
  const dir = lastSlashIndex !== -1 ? file.path.slice(0, lastSlashIndex) : "";
  const badge = BADGE[file.status];

  return (
    <div
      className={`group relative flex items-center gap-2 h-[24px] pl-3 pr-2 cursor-pointer text-[13px] hover:bg-bg-hover ${
        isActive ? "bg-bg-active text-text" : "text-text-muted"
      }`}
      onClick={() => onOpenDiff(file)}
      title={file.path}
    >
      <FileIcon name={name} isDir={false} />
      <span className="flex-1 flex items-baseline gap-[6px] min-w-0">
        <span className="text-text truncate shrink-0 max-w-full">{name}</span>
        {dir && <span className="text-[11px] text-text-muted truncate min-w-0 flex-1">{dir}</span>}
      </span>
      {onDiscard && (
        <button
          className="absolute right-[44px] top-1/2 -translate-y-1/2 flex items-center justify-center w-[18px] h-[18px] rounded-[3px] bg-bg-active text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDiscard(file);
          }}
          title="Discard changes"
        >
          <DiscardIcon />
        </button>
      )}
      <button
        className="absolute right-[24px] top-1/2 -translate-y-1/2 flex items-center justify-center w-[18px] h-[18px] rounded-[3px] bg-bg-active text-text-muted opacity-0 group-hover:opacity-100 hover:text-text"
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
  collapsible,
  children,
}: {
  title: string;
  count: number;
  action?: { label: string; onClick: () => void; title: string };
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (count === 0) return null;
  return (
    <div className="flex flex-col">
      <div
        className={`group flex items-center justify-between pl-3 pr-2 h-[24px] ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
      >
        <span className="flex items-center gap-[5px] text-[10px] font-semibold text-text-muted uppercase tracking-[0.08em]">
          {collapsible && (
            <svg
              width="8" height="8" viewBox="0 0 8 8" fill="currentColor"
              className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
            >
              <path d="M0 2l4 4 4-4z" />
            </svg>
          )}
          {title}
        </span>
        <div className="flex items-center gap-1">
          {action && !collapsed && (
            <button
              className="text-[14px] leading-none text-text-muted opacity-0 group-hover:opacity-100 hover:text-text cursor-pointer px-1"
              onClick={(e) => { e.stopPropagation(); action.onClick(); }}
              title={action.title}
            >
              {action.label}
            </button>
          )}
          <span className="text-[10px] text-text-dim tabular-nums">{count}</span>
        </div>
      </div>
      {!collapsed && children}
    </div>
  );
}

function CappedRows({
  files,
  staged,
  onAction,
  onDiscard,
  onOpenDiff,
}: {
  files: GitFile[];
  staged: boolean;
  onAction: (file: GitFile) => void;
  onDiscard?: (file: GitFile) => void;
  onOpenDiff: (file: GitFile) => void;
}) {
  const shown = files.length > RENDER_LIMIT ? files.slice(0, RENDER_LIMIT) : files;
  return (
    <>
      {shown.map((f) => (
        <FileRow
          key={`${staged ? "s" : "u"}:${f.path}`}
          file={f}
          staged={staged}
          onAction={onAction}
          onDiscard={onDiscard}
          onOpenDiff={onOpenDiff}
        />
      ))}
      {files.length > RENDER_LIMIT && (
        <div className="pl-3 pr-2 h-[24px] flex items-center text-[11px] text-text-dim">
          {files.length - RENDER_LIMIT} more not shown
        </div>
      )}
    </>
  );
}

export function GitPanel({ ctx }: { ctx: ExtensionContext }) {
  const { branch, staged, modified, untracked, stashes, isRepo, workspacePath } = useGitStore();
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [stashing, setStashing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const menu = useContextMenu<null>();

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
  async function discard(file: GitFile) {
    if (!workspacePath) return;
    const name = file.path.split("/").pop() ?? file.path;
    const verb = file.status === "untracked" ? "delete" : "discard changes in";
    const ok = await ctx.dialog.confirm(`Are you sure you want to ${verb} ${name}? This is irreversible.`, {
      title: "Discard Changes",
      danger: true,
      confirmLabel: "Discard",
    });
    if (!ok) return;
    await gitDiscard(workspacePath, file.path).catch(() => {});
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
  async function stash() {
    if (!workspacePath) return;
    const hasChanges = staged.length > 0 || unstagedFiles.length > 0;
    if (!hasChanges) return;
    setStashing(true);
    try {
      await gitStash(workspacePath, message.trim() || undefined);
      setMessage("");
      refreshGitStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setStashing(false);
    }
  }
  async function applyStash(s: GitStash) {
    if (!workspacePath) return;
    await gitStashApply(workspacePath, s.index).catch(() => {});
    refreshGitStatus();
  }
  async function dropStash(s: GitStash) {
    if (!workspacePath) return;
    const ok = await ctx.dialog.confirm(`Drop stash "${s.message || `stash@{${s.index}}`}"? This is irreversible.`, {
      title: "Drop Stash",
      danger: true,
      confirmLabel: "Drop",
    });
    if (!ok) return;
    await gitStashDrop(workspacePath, s.index).catch(() => {});
    refreshGitStatus();
  }

  async function push() {
    if (!workspacePath) return;
    setSyncing(true);
    try {
      await gitPush(workspacePath);
      refreshGitStatus();
    } catch (e) {
      await ctx.dialog.show({ title: "Push failed", message: `${e}`, buttons: [{ id: "ok", label: "OK", variant: "primary" }] });
    } finally {
      setSyncing(false);
    }
  }
  async function pull() {
    if (!workspacePath) return;
    setSyncing(true);
    try {
      await gitPull(workspacePath);
      refreshGitStatus();
    } catch (e) {
      await ctx.dialog.show({ title: "Pull failed", message: `${e}`, buttons: [{ id: "ok", label: "OK", variant: "primary" }] });
    } finally {
      setSyncing(false);
    }
  }

  const canCommit = staged.length > 0 && message.trim().length > 0 && !committing;
  const canStash = (staged.length > 0 || unstagedFiles.length > 0) && !stashing;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center pl-3 pr-2 h-[34px] border-b border-border shrink-0">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em]">
          Source Control
        </span>
        {isRepo && branch && (
          <span className="ml-2 flex items-center gap-[5px] text-[11px] text-text-muted">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            {branch}
          </span>
        )}
        {isRepo && (
          <button
            className="ml-auto flex items-center justify-center w-[22px] h-[22px] rounded text-text-muted/50 hover:text-text-muted hover:bg-bg-active transition-colors cursor-pointer"
            onClick={(e) => menu.open(e, null)}
            title="More actions"
            disabled={syncing}
          >
            {syncing ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a10 10 0 0 1 10 10" />
                <circle cx="12" cy="12" r="10" opacity="0.2" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
              </svg>
            )}
          </button>
        )}
      </div>
      {menu.state && (
        <ContextMenu
          x={menu.state.x}
          y={menu.state.y}
          onClose={menu.close}
          items={[
            { label: "Pull", onSelect: () => { menu.close(); void pull(); } },
            { label: "Push", onSelect: () => { menu.close(); void push(); } },
          ]}
        />
      )}

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
            <div className="flex gap-2">
              <button
                className="flex-1 h-[28px] rounded-[5px] bg-accent text-accent-fg text-[12px] font-medium cursor-pointer transition-opacity hover:opacity-[0.86] disabled:opacity-40 disabled:cursor-default"
                onClick={commit}
                disabled={!canCommit}
              >
                {committing ? "Committing…" : `Commit${staged.length ? ` (${staged.length})` : ""}`}
              </button>
              <button
                className="h-[28px] px-3 rounded-[5px] bg-bg-active border border-border text-text-muted text-[12px] font-medium cursor-pointer transition-opacity hover:opacity-[0.86] hover:text-text disabled:opacity-40 disabled:cursor-default"
                onClick={stash}
                disabled={!canStash}
                title="Stash changes"
              >
                {stashing ? "Stashing…" : "Stash"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            <Section
              title="Staged Changes"
              count={staged.length}
              action={{ label: "−", onClick: unstageAll, title: "Unstage all" }}
            >
              <CappedRows files={staged} staged onAction={unstage} onOpenDiff={openDiff} />
            </Section>

            <Section
              title="Changes"
              count={unstagedFiles.length}
              action={{ label: "+", onClick: stageAll, title: "Stage all" }}
            >
              <CappedRows
                files={unstagedFiles}
                staged={false}
                onAction={stage}
                onDiscard={discard}
                onOpenDiff={openDiff}
              />
            </Section>

            {staged.length === 0 && unstagedFiles.length === 0 && (
              <div className="px-3 py-4 text-[11px] text-text-dim">No changes</div>
            )}
          </div>

          {stashes.length > 0 && (
            <div className="shrink-0 border-t border-border">
              <Section title="Stashes" count={stashes.length} collapsible>
                {stashes.map((s) => (
                  <StashRow key={s.index} stash={s} onApply={applyStash} onDrop={dropStash} />
                ))}
              </Section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
