import type { DirEntry, FileStatus } from "@jelly/sdk";
import { FileIcon } from "@jelly/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceStore } from "../store";

const STATUS_COLOR: Record<FileStatus, string> = {
  untracked: "text-success",
  added: "text-success",
  modified: "text-warning",
  renamed: "text-accent",
  deleted: "text-danger",
};

const STATUS_PRIORITY: Record<FileStatus, number> = {
  deleted: 4,
  modified: 3,
  renamed: 2,
  added: 1,
  untracked: 1,
};

function buildFolderStatuses(gitStatuses: Record<string, FileStatus>): Record<string, FileStatus> {
  const result: Record<string, FileStatus> = {};
  for (const [filePath, status] of Object.entries(gitStatuses)) {
    const parts = filePath.split("/");
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join("/");
      const existing = result[folderPath];
      if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing]) {
        result[folderPath] = status;
      }
    }
  }
  return result;
}

export const INDENT = 12;

export interface Draft {
  parentPath: string;
  depth: number;
  isDir: boolean;
  renaming?: string;
  initial: string;
}

interface RowsProps {
  nodes: DirEntry[];
  depth: number;
  expandedDirs: Set<string>;
  draft: Draft | null;
  hideGitIgnored: boolean;
  rowEls: Map<string, HTMLElement>;
  highlightEls: Map<string, HTMLElement>;
  onToggle: (entry: DirEntry) => void;
  onOpen: (entry: DirEntry, pin: boolean) => void;
  onClick: (e: React.MouseEvent, entry: DirEntry) => void;
  onPointerDownRow: (e: React.PointerEvent, entry: DirEntry) => void;
  onContext: (e: React.MouseEvent, entry: DirEntry) => void;
  onRename: (entry: DirEntry, depth: number) => void;
  onCommitDraft: (name: string) => void;
  onCancelDraft: () => void;
}

export function Rows(props: RowsProps) {
  const { nodes, depth, expandedDirs, draft, hideGitIgnored } = props;
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const gitStatuses = useWorkspaceStore((s) => s.gitStatuses);
  const selected = useWorkspaceStore((s) => s.selected);
  const folderStatuses = useMemo(() => buildFolderStatuses(gitStatuses), [gitStatuses]);

  const visibleNodes = hideGitIgnored ? nodes.filter((n) => !n.ignored) : nodes;

  return (
    <>
      {visibleNodes.map((entry) => {
        const expanded = entry.isDir && expandedDirs.has(entry.path);
        const isActive = entry.path === activeFilePath && selected.size === 0;
        const isSelected = selected.has(entry.path);
        const statusColor = entry.isDir
          ? STATUS_COLOR[folderStatuses[entry.path]] ?? ""
          : STATUS_COLOR[gitStatuses[entry.path]] ?? "";
        return (
          <div
            key={entry.path}
            ref={
              entry.isDir
                ? (el) => {
                    if (el) props.highlightEls.set(entry.path, el);
                    else props.highlightEls.delete(entry.path);
                  }
                : undefined
            }
            className={`w-full rounded-[4px] ${entry.ignored ? "opacity-40" : ""}`}
          >
            {draft?.renaming === entry.path ? (
              <DraftRow draft={draft} onCommit={props.onCommitDraft} onCancel={props.onCancelDraft} />
            ) : (
              <div
                ref={(el) => {
                  if (el) props.rowEls.set(entry.path, el);
                  else props.rowEls.delete(entry.path);
                }}
                draggable={false}
                tabIndex={0}
                data-path={entry.path}
                data-dir={entry.isDir ? "1" : "0"}
                className={`group flex w-full box-border items-center gap-[6px] h-[24px] pr-2 cursor-pointer text-[13px] transition-colors duration-[60ms] rounded-[2px] outline-none focus-visible:shadow-[inset_0_0_0_1px] focus-visible:shadow-accent/50 ${
                  isSelected
                    ? "bg-accent/20 text-text"
                    : isActive
                    ? "bg-bg-active text-text"
                    : "text-text-muted hover:bg-bg-hover focus-visible:bg-bg-hover"
                }`}
                style={{ paddingLeft: depth * INDENT + 10 }}
                onClick={(e) => props.onClick(e, entry)}
                onPointerDown={(e) => props.onPointerDownRow(e, entry)}
                onDoubleClick={() => !entry.isDir && props.onOpen(entry, true)}
                onDragStart={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (entry.isDir) props.onToggle(entry);
                    else props.onRename(entry, depth);
                  }
                }}
                onContextMenu={(e) => props.onContext(e, entry)}
              >
                {entry.isDir && <Chevron expanded={expanded} />}
                {!entry.isDir && <span className="w-[10px] shrink-0" />}
                <FileIcon name={entry.name} isDir={entry.isDir} isOpen={expanded} />
                <span className={`truncate ${statusColor}`}>{entry.name}</span>
              </div>
            )}

            {expanded && entry.children && <Rows {...props} nodes={entry.children} depth={depth + 1} />}

            {draft && !draft.renaming && draft.parentPath === entry.path && expanded && (
              <DraftRow draft={draft} onCommit={props.onCommitDraft} onCancel={props.onCancelDraft} />
            )}
          </div>
        );
      })}
    </>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-text-dim transition-transform duration-[80ms] ${expanded ? "rotate-90" : ""}`}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

export function DraftRow({
  draft,
  onCommit,
  onCancel,
}: {
  draft: Draft;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(draft.initial);

  useEffect(() => {
    ref.current?.focus();
    if (draft.initial) {
      const dot = draft.initial.lastIndexOf(".");
      ref.current?.setSelectionRange(0, dot > 0 ? dot : draft.initial.length);
    }
  }, [draft.initial]);

  return (
    <div
      className="flex items-center gap-[6px] h-[24px] pr-2"
      style={{ paddingLeft: draft.depth * INDENT + 10 }}
    >
      <span className="w-[10px] shrink-0" />
      <FileIcon name={value || "x"} isDir={draft.isDir} />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onCommit(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(value);
          else if (e.key === "Escape") onCancel();
        }}
        className="flex-1 bg-bg border border-accent rounded-[3px] px-[4px] h-[19px] text-[13px] text-text outline-none"
        spellCheck={false}
      />
    </div>
  );
}
