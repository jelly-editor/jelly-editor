import type { DirEntry, ExtensionContext } from "@jelly/sdk";
import { confirm, ipc } from "@jelly/ipc";
import { FileIcon } from "@jelly/ui";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../store";

const { list: listDir, create: createFile, createDir, rename: renamePath, delete: deletePath } =
  ipc.fs;

const INDENT = 12;

function parentOf(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}
function joinPath(dir: string, name: string) {
  return `${dir}/${name}`;
}

async function refreshDir(dirPath: string) {
  const children = await listDir(dirPath);
  useWorkspaceStore.getState().setChildren(dirPath, children);
}

interface Draft {
  parentPath: string;
  depth: number;
  isDir: boolean;
  renaming?: string;
  initial: string;
}

interface ContextMenu {
  x: number;
  y: number;
  entry: DirEntry | null;
}

export function FileTree({ ctx }: { ctx: ExtensionContext }) {
  const { path: root, tree, expandedDirs, setExpanded, setChildren } = useWorkspaceStore();
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [menu]);

  if (!root) {
    return <div className="px-[14px] py-4 text-[11px] text-text-dim">No folder open</div>;
  }

  function openFile(entry: DirEntry, pin: boolean) {
    void ctx.commands.execute("editor.open", entry.path, entry.name, { pin });
  }

  async function toggleDir(entry: DirEntry) {
    const expanded = expandedDirs.has(entry.path);
    setExpanded(entry.path, !expanded);
    if (!expanded && entry.children === undefined) {
      try {
        const children = await listDir(entry.path);
        setChildren(entry.path, children);
      } catch {
        /* ignore */
      }
    }
  }

  function startCreate(parentDir: string, depth: number, isDir: boolean) {
    setMenu(null);
    setExpanded(parentDir, true);
    if (useWorkspaceStore.getState().expandedDirs.has(parentDir)) {
      const node = findNode(tree, parentDir);
      if (parentDir !== root && node?.children === undefined) {
        listDir(parentDir).then((c) => setChildren(parentDir, c)).catch(() => {});
      }
    }
    setDraft({ parentPath: parentDir, depth, isDir, initial: "" });
  }

  function startRename(entry: DirEntry, depth: number) {
    setMenu(null);
    setDraft({
      parentPath: parentOf(entry.path),
      depth,
      isDir: entry.isDir,
      renaming: entry.path,
      initial: entry.name,
    });
  }

  async function commitDraft(name: string) {
    const d = draft;
    setDraft(null);
    if (!d || !name.trim()) return;
    const target = joinPath(d.parentPath, name.trim());
    try {
      if (d.renaming) {
        if (target !== d.renaming) {
          await renamePath(d.renaming, target);
          void ctx.commands.execute("editor.renameFile", d.renaming, target, name.trim());
        }
      } else if (d.isDir) {
        await createDir(target);
      } else {
        await createFile(target);
      }
      await refreshDir(d.parentPath);
    } catch (e) {
      await confirm(`${e}`, { title: "Operation failed", kind: "error" });
    }
  }

  async function remove(entry: DirEntry) {
    setMenu(null);
    const ok = await confirm(
      `Delete ${entry.isDir ? "folder" : "file"} "${entry.name}"?`,
      { title: "Confirm delete", kind: "warning" },
    );
    if (!ok) return;
    try {
      await deletePath(entry.path);
      void ctx.commands.execute("editor.closeFile", entry.path);
      await refreshDir(parentOf(entry.path));
    } catch (e) {
      await confirm(`${e}`, { title: "Delete failed", kind: "error" });
    }
  }

  const rootName = root.split("/").pop() ?? root;

  return (
    <div className="flex flex-col flex-1 overflow-hidden select-none">
      <div className="group/hdr flex items-center justify-between pl-[10px] pr-2 h-[26px] shrink-0">
        <span className="text-[11px] font-semibold text-text uppercase tracking-[0.06em] truncate">
          {rootName}
        </span>
        <div className="flex items-center gap-px opacity-0 group-hover/hdr:opacity-100 transition-opacity">
          <ToolbarButton title="New File" onClick={() => startCreate(root, 0, false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title="New Folder" onClick={() => startCreate(root, 0, true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <line x1="12" y1="11" x2="12" y2="16" /><line x1="9.5" y1="13.5" x2="14.5" y2="13.5" />
            </svg>
          </ToolbarButton>
        </div>
      </div>
      <div
        className="flex flex-col flex-1 overflow-y-auto pb-1 select-none"
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, entry: null });
        }}
      >
        <Rows
          nodes={tree}
          depth={0}
          expandedDirs={expandedDirs}
          draft={draft}
          onToggle={toggleDir}
          onOpen={openFile}
          onContext={(e, entry) => {
            e.preventDefault();
            e.stopPropagation();
            setMenu({ x: e.clientX, y: e.clientY, entry });
          }}
          onCommitDraft={commitDraft}
          onCancelDraft={() => setDraft(null)}
        />

        {draft && draft.parentPath === root && (
          <DraftRow draft={draft} onCommit={commitDraft} onCancel={() => setDraft(null)} />
        )}
      </div>

      {menu && (
        <ContextMenuView
          menu={menu}
          rootPath={root}
          onNewFile={(dir, depth) => startCreate(dir, depth, false)}
          onNewFolder={(dir, depth) => startCreate(dir, depth, true)}
          onRename={startRename}
          onDelete={remove}
        />
      )}
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center w-[22px] h-[22px] rounded-[4px] bg-transparent text-text-muted cursor-pointer hover:bg-bg-hover hover:text-text"
    >
      {children}
    </button>
  );
}

function findNode(nodes: DirEntry[], path: string): DirEntry | undefined {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children && path.startsWith(n.path + "/")) {
      const found = findNode(n.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

interface RowsProps {
  nodes: DirEntry[];
  depth: number;
  expandedDirs: Set<string>;
  draft: Draft | null;
  onToggle: (entry: DirEntry) => void;
  onOpen: (entry: DirEntry, pin: boolean) => void;
  onContext: (e: React.MouseEvent, entry: DirEntry) => void;
  onCommitDraft: (name: string) => void;
  onCancelDraft: () => void;
}

function Rows(props: RowsProps) {
  const { nodes, depth, expandedDirs, draft } = props;
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);

  return (
    <>
      {nodes.map((entry) => {
        const expanded = entry.isDir && expandedDirs.has(entry.path);
        const isActive = entry.path === activeFilePath;
        return (
          <div key={entry.path}>
            {draft?.renaming === entry.path ? (
              <DraftRow draft={draft} onCommit={props.onCommitDraft} onCancel={props.onCancelDraft} />
            ) : (
              <div
                className={`group flex items-center gap-[6px] h-[24px] pr-2 cursor-pointer text-[13px] transition-colors duration-[60ms] hover:bg-bg-hover ${
                  isActive ? "bg-bg-active text-text" : "text-text-muted"
                }`}
                style={{ paddingLeft: depth * INDENT + 10 }}
                onClick={() => (entry.isDir ? props.onToggle(entry) : props.onOpen(entry, false))}
                onDoubleClick={() => !entry.isDir && props.onOpen(entry, true)}
                onContextMenu={(e) => props.onContext(e, entry)}
              >
                {entry.isDir && <Chevron expanded={expanded} />}
                {!entry.isDir && <span className="w-[10px] shrink-0" />}
                <FileIcon name={entry.name} isDir={entry.isDir} isOpen={expanded} />
                <span className="truncate">{entry.name}</span>
              </div>
            )}

            {expanded && entry.children && (
              <Rows {...props} nodes={entry.children} depth={depth + 1} />
            )}

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

function DraftRow({
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

function ContextMenuView({
  menu,
  rootPath,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: {
  menu: ContextMenu;
  rootPath: string;
  onNewFile: (dir: string, depth: number) => void;
  onNewFolder: (dir: string, depth: number) => void;
  onRename: (entry: DirEntry, depth: number) => void;
  onDelete: (entry: DirEntry) => void;
}) {
  const entry = menu.entry;
  const targetDir = !entry ? rootPath : entry.isDir ? entry.path : parentOf(entry.path);
  const targetDepth = !entry
    ? 0
    : entry.isDir
    ? depthOf(entry.path, rootPath) + 1
    : depthOf(entry.path, rootPath);

  const Item = ({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) => (
    <button
      className={`flex items-center w-full text-left px-3 h-[26px] text-[12px] cursor-pointer hover:bg-bg-hover ${
        danger ? "text-danger" : "text-text"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed z-[200] min-w-[150px] py-1 bg-bg-elevated border border-border rounded-[6px] shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <Item label="New File" onClick={() => onNewFile(targetDir, targetDepth)} />
      <Item label="New Folder" onClick={() => onNewFolder(targetDir, targetDepth)} />
      {entry && (
        <>
          <div className="my-1 border-t border-border" />
          <Item label="Rename" onClick={() => onRename(entry, depthOf(entry.path, rootPath))} />
          <Item label="Delete" danger onClick={() => onDelete(entry)} />
        </>
      )}
    </div>
  );
}

function depthOf(path: string, rootPath: string): number {
  const rel = path.slice(rootPath.length + 1);
  return rel.split("/").length - 1;
}
