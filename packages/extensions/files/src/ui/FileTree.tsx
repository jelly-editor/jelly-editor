import type { DirEntry, ExtensionContext, FileStatus } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { ContextMenu, type ContextMenuEntry, FileIcon, useContextMenu } from "@jelly/ui";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../store";

const STATUS_COLOR: Record<FileStatus, string> = {
  untracked: "text-success",
  added: "text-success",
  modified: "text-warning",
  renamed: "text-accent",
  deleted: "text-danger",
};

const {
  list: listDir,
  create: createFile,
  createDir,
  rename: renamePath,
  copy: copyPath,
  delete: deletePath,
} = ipc.fs;

const INDENT = 12;
const DRAG_MIME = "application/x-jelly-path";
// Drop-target ring, toggled directly on DOM nodes (no React re-render mid-drag).
const HIGHLIGHT = ["bg-accent/15", "shadow-[inset_0_0_0_1px]", "shadow-accent/50"];

function parentOf(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}
function joinPath(dir: string, name: string) {
  return `${dir}/${name}`;
}

/** A non-colliding variant of `name` for `taken`: "file.ts" → "file copy.ts" → "file copy 2.ts". */
function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = `${base} copy${ext}`;
  for (let i = 2; taken.has(candidate); i++) candidate = `${base} copy ${i}${ext}`;
  return candidate;
}

async function refreshDir(dirPath: string) {
  const children = await listDir(dirPath);
  useWorkspaceStore.getState().setChildren(dirPath, children);
}

/** A small name-only pill used as the drag image (instead of the full row). */
function makeDragBadge(entry: DirEntry, count: number): HTMLElement {
  const badge = document.createElement("div");
  badge.textContent = count > 1 ? `${count} items` : entry.name;
  badge.className =
    "fixed -top-[1000px] left-0 px-2 h-[22px] flex items-center rounded-[5px] " +
    "bg-bg-elevated border border-border text-text text-[12px] shadow-lg pointer-events-none";
  document.body.appendChild(badge);
  // Remove once the browser has snapshotted it for the drag cursor.
  setTimeout(() => badge.remove(), 0);
  return badge;
}

interface Draft {
  parentPath: string;
  depth: number;
  isDir: boolean;
  renaming?: string;
  initial: string;
}

export function FileTree({ ctx }: { ctx: ExtensionContext }) {
  const { path: root, tree, expandedDirs, setExpanded, setChildren, setSelection, toggleSelection, clearSelection } =
    useWorkspaceStore();
  // Right-click target: a tree entry, or null for the empty area (= root).
  const menu = useContextMenu<DirEntry | null>();
  const [draft, setDraft] = useState<Draft | null>(null);
  // Whether the shared clipboard holds something pasteable. Refreshed each time
  // the menu opens, since another window may have copied since the last check.
  const [canPaste, setCanPaste] = useState(false);
  // Drag-and-drop is driven entirely through refs/DOM so dragging over a large
  // tree never re-renders React (the old `useState` highlight was the lag).
  const dragging = useRef<string[]>([]); // paths being dragged
  const rowEls = useRef(new Map<string, HTMLElement>()); // dir path → drop-target node
  const highlightedDir = useRef<string | null>(null);

  if (!root) {
    return <div className="px-[14px] py-4 text-[11px] text-text-dim">No folder open</div>;
  }

  function openFile(entry: DirEntry, pin: boolean) {
    void ctx.commands.execute("editor.open", entry.path, entry.name, { pin });
  }

  function onRowClick(e: React.MouseEvent, entry: DirEntry) {
    if (e.metaKey || e.ctrlKey) {
      toggleSelection(entry.path);
      return;
    }
    setSelection([entry.path]);
    if (entry.isDir) void toggleDir(entry);
    else openFile(entry, false);
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
    setDraft({
      parentPath: parentOf(entry.path),
      depth,
      isDir: entry.isDir,
      renaming: entry.path,
      initial: entry.name,
    });
  }

  function alertError(message: string, title: string) {
    return ctx.dialog.show({
      title,
      message,
      kind: "error",
      buttons: [{ id: "ok", label: "OK", variant: "primary" }],
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
          ctx.events.emit("files:renamed", { from: d.renaming, to: target });
        }
      } else if (d.isDir) {
        await createDir(target);
      } else {
        await createFile(target);
      }
      await refreshDir(d.parentPath);
    } catch (e) {
      await alertError(`${e}`, "Operation failed");
    }
  }

  // The entries an action operates on: the whole selection when the target is
  // part of it, otherwise just the target itself.
  function actionTargets(entry: DirEntry): string[] {
    const selected = useWorkspaceStore.getState().selected;
    return selected.has(entry.path) && selected.size > 1 ? [...selected] : [entry.path];
  }

  async function remove(entry: DirEntry) {
    const paths = actionTargets(entry);
    const label = paths.length > 1 ? `${paths.length} items` : `${entry.isDir ? "folder" : "file"} "${entry.name}"`;
    const ok = await ctx.dialog.confirm(`Delete ${label}? This cannot be undone.`, {
      title: "Confirm delete",
      kind: "warning",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const parents = new Set<string>();
    try {
      for (const path of paths) {
        await deletePath(path);
        void ctx.commands.execute("editor.closeFile", path);
        parents.add(parentOf(path));
      }
      clearSelection();
      for (const dir of parents) await refreshDir(dir);
    } catch (e) {
      await alertError(`${e}`, "Delete failed");
    }
  }

  function openMenu(e: React.MouseEvent, entry: DirEntry | null) {
    if (entry && !useWorkspaceStore.getState().selected.has(entry.path)) setSelection([entry.path]);
    menu.open(e, entry);
    void ipc.clipboard.read().then((c) => setCanPaste(!!c?.paths.length));
  }

  function clip(entry: DirEntry, cut: boolean) {
    void ipc.clipboard.write(actionTargets(entry), cut);
  }

  async function paste(destDir: string) {
    const entry = await ipc.clipboard.read();
    if (!entry?.paths.length) return;
    await transferAll(entry.paths, destDir, !entry.cut);
    if (entry.cut) await ipc.clipboard.clear();
  }

  // The directory a drop on `entry` targets: a folder receives into itself, a
  // file into its parent. With no entry (empty space) the drop targets the root.
  function dropDirOf(entry: DirEntry | null): string {
    if (!entry) return root!;
    return entry.isDir ? entry.path : parentOf(entry.path);
  }

  function canDrop(srcs: string[], destDir: string, asCopy: boolean): boolean {
    if (!srcs.length) return false;
    if (srcs.some((s) => destDir === s || destDir.startsWith(s + "/"))) return false; // not into self/descendant
    if (!asCopy && srcs.every((s) => parentOf(s) === destDir)) return false; // already lives here
    return true;
  }

  // Toggle the drop-target ring directly on the destination's DOM node.
  function highlight(destDir: string | null) {
    if (highlightedDir.current === destDir) return;
    const prev = highlightedDir.current;
    if (prev) rowEls.current.get(prev)?.classList.remove(...HIGHLIGHT);
    if (destDir) rowEls.current.get(destDir)?.classList.add(...HIGHLIGHT);
    highlightedDir.current = destDir;
  }

  function onDragStart(e: React.DragEvent, entry: DirEntry) {
    const selected = useWorkspaceStore.getState().selected;
    const paths = selected.has(entry.path) && selected.size > 1 ? [...selected] : [entry.path];
    if (!selected.has(entry.path)) setSelection([entry.path]);
    dragging.current = paths;
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(paths));
    // A single file also advertises an open payload so editor panes accept it.
    if (paths.length === 1 && !entry.isDir) {
      e.dataTransfer.setData("application/x-jelly-file", JSON.stringify({ path: entry.path, name: entry.name }));
    }
    e.dataTransfer.effectAllowed = "copyMove"; // move by default, copy with Option
    e.dataTransfer.setDragImage(makeDragBadge(entry, paths.length), 12, 12);
  }

  function onDragOver(e: React.DragEvent, entry: DirEntry | null) {
    const destDir = dropDirOf(entry);
    if (!canDrop(dragging.current, destDir, e.altKey)) {
      highlight(null);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
    highlight(destDir);
  }

  function onDrop(e: React.DragEvent, entry: DirEntry | null) {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData(DRAG_MIME);
    const srcs = raw ? (JSON.parse(raw) as string[]) : dragging.current;
    const destDir = dropDirOf(entry);
    const asCopy = e.altKey;
    highlight(null);
    dragging.current = [];
    if (canDrop(srcs, destDir, asCopy)) void transferAll(srcs, destDir, asCopy);
  }

  function onDragEnd() {
    dragging.current = [];
    highlight(null);
  }

  async function transferAll(froms: string[], destDir: string, asCopy: boolean) {
    for (const from of froms) await transfer(from, destDir, asCopy);
  }

  // Move (rename) or copy `from` into `destDir`, refreshing the affected dirs.
  async function transfer(from: string, destDir: string, asCopy: boolean) {
    const name = from.slice(from.lastIndexOf("/") + 1);
    const verb = asCopy ? "Copy" : "Move";
    try {
      const siblings = await listDir(destDir);
      const taken = new Set(siblings.map((c) => c.name));

      let target = joinPath(destDir, name);
      let overwrite = false;
      // Copying into the source's own folder duplicates it (Finder-style), with
      // no prompt; moving into the same folder is a no-op.
      if (parentOf(from) === destDir) {
        if (!asCopy) return;
        target = joinPath(destDir, uniqueName(name, taken));
      } else if (taken.has(name)) {
        const choice = await ctx.dialog.show({
          title: `${verb} — name already exists`,
          message: `"${name}" already exists in this folder.`,
          kind: "warning",
          dismissId: "cancel",
          buttons: [
            { id: "cancel", label: "Cancel" },
            { id: "duplicate", label: "Keep Both" },
            { id: "overwrite", label: "Replace", variant: "danger" },
          ],
        });
        if (choice === "cancel") return;
        if (choice === "duplicate") target = joinPath(destDir, uniqueName(name, taken));
        else overwrite = true;
      }

      if (overwrite) await deletePath(target);
      if (asCopy) {
        await copyPath(from, target);
      } else {
        await renamePath(from, target);
        ctx.events.emit("files:renamed", { from, to: target });
        await refreshDir(parentOf(from));
      }
      setExpanded(destDir, true);
      await refreshDir(destDir);
    } catch (e) {
      await alertError(`${e}`, `${verb} failed`);
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
        ref={(el) => {
          if (el) rowEls.current.set(root, el);
          else rowEls.current.delete(root);
        }}
        className="flex flex-col flex-1 overflow-y-auto pb-1 select-none rounded-[2px]"
        onClick={(e) => e.target === e.currentTarget && clearSelection()}
        onContextMenu={(e) => openMenu(e, null)}
        onDragOver={(e) => onDragOver(e, null)}
        onDrop={(e) => onDrop(e, null)}
      >
        <Rows
          nodes={tree}
          depth={0}
          expandedDirs={expandedDirs}
          draft={draft}
          rowEls={rowEls.current}
          onToggle={toggleDir}
          onOpen={openFile}
          onClick={onRowClick}
          onContext={openMenu}
          onRename={startRename}
          onCommitDraft={commitDraft}
          onCancelDraft={() => setDraft(null)}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
        />

        {draft && !draft.renaming && draft.parentPath === root && (
          <DraftRow draft={draft} onCommit={commitDraft} onCancel={() => setDraft(null)} />
        )}
      </div>

      {menu.state && (
        <ContextMenu
          x={menu.state.x}
          y={menu.state.y}
          onClose={menu.close}
          items={fileMenuItems(menu.state.data, root, canPaste, {
            onNewFile: (dir, depth) => startCreate(dir, depth, false),
            onNewFolder: (dir, depth) => startCreate(dir, depth, true),
            onCopy: (entry) => clip(entry, false),
            onCut: (entry) => clip(entry, true),
            onPaste: paste,
            onRename: startRename,
            onDelete: remove,
          })}
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
  rowEls: Map<string, HTMLElement>;
  onToggle: (entry: DirEntry) => void;
  onOpen: (entry: DirEntry, pin: boolean) => void;
  onClick: (e: React.MouseEvent, entry: DirEntry) => void;
  onContext: (e: React.MouseEvent, entry: DirEntry) => void;
  onRename: (entry: DirEntry, depth: number) => void;
  onCommitDraft: (name: string) => void;
  onCancelDraft: () => void;
  onDragStart: (e: React.DragEvent, entry: DirEntry) => void;
  onDragOver: (e: React.DragEvent, entry: DirEntry) => void;
  onDrop: (e: React.DragEvent, entry: DirEntry) => void;
  onDragEnd: () => void;
}

function Rows(props: RowsProps) {
  const { nodes, depth, expandedDirs, draft } = props;
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const gitStatuses = useWorkspaceStore((s) => s.gitStatuses);
  const selected = useWorkspaceStore((s) => s.selected);

  return (
    <>
      {nodes.map((entry) => {
        const expanded = entry.isDir && expandedDirs.has(entry.path);
        const isActive = entry.path === activeFilePath;
        const isSelected = selected.has(entry.path);
        const statusColor = entry.isDir ? "" : STATUS_COLOR[gitStatuses[entry.path]] ?? "";
        return (
          <div
            key={entry.path}
            // Folders register their whole block (row + children) as the drop
            // target, so the highlight encloses the entire folder.
            ref={
              entry.isDir
                ? (el) => {
                    if (el) props.rowEls.set(entry.path, el);
                    else props.rowEls.delete(entry.path);
                  }
                : undefined
            }
            className="rounded-[4px]"
          >
            {draft?.renaming === entry.path ? (
              <DraftRow draft={draft} onCommit={props.onCommitDraft} onCancel={props.onCancelDraft} />
            ) : (
              <div
                draggable
                tabIndex={0}
                className={`group flex items-center gap-[6px] h-[24px] pr-2 cursor-pointer text-[13px] transition-colors duration-[60ms] hover:bg-bg-hover rounded-[2px] outline-none focus-visible:bg-bg-hover focus-visible:shadow-[inset_0_0_0_1px] focus-visible:shadow-accent/50 ${
                  isSelected ? "bg-accent/20 text-text" : isActive ? "bg-bg-active text-text" : "text-text-muted"
                }`}
                style={{ paddingLeft: depth * INDENT + 10 }}
                onClick={(e) => props.onClick(e, entry)}
                onDoubleClick={() => !entry.isDir && props.onOpen(entry, true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (entry.isDir) props.onToggle(entry);
                    else props.onRename(entry, depth);
                  }
                }}
                onContextMenu={(e) => props.onContext(e, entry)}
                onDragStart={(e) => props.onDragStart(e, entry)}
                onDragOver={(e) => props.onDragOver(e, entry)}
                onDrop={(e) => props.onDrop(e, entry)}
                onDragEnd={props.onDragEnd}
              >
                {entry.isDir && <Chevron expanded={expanded} />}
                {!entry.isDir && <span className="w-[10px] shrink-0" />}
                <FileIcon name={entry.name} isDir={entry.isDir} isOpen={expanded} />
                <span className={`truncate ${statusColor}`}>{entry.name}</span>
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

/** Build the file-tree context menu for a right-clicked entry (or the root). */
function fileMenuItems(
  entry: DirEntry | null,
  rootPath: string,
  canPaste: boolean,
  handlers: {
    onNewFile: (dir: string, depth: number) => void;
    onNewFolder: (dir: string, depth: number) => void;
    onCopy: (entry: DirEntry) => void;
    onCut: (entry: DirEntry) => void;
    onPaste: (dir: string) => void;
    onRename: (entry: DirEntry, depth: number) => void;
    onDelete: (entry: DirEntry) => void;
  },
): ContextMenuEntry[] {
  const targetDir = !entry ? rootPath : entry.isDir ? entry.path : parentOf(entry.path);
  const targetDepth = !entry
    ? 0
    : entry.isDir
    ? depthOf(entry.path, rootPath) + 1
    : depthOf(entry.path, rootPath);

  const items: ContextMenuEntry[] = [
    { label: "New File", onSelect: () => handlers.onNewFile(targetDir, targetDepth) },
    { label: "New Folder", onSelect: () => handlers.onNewFolder(targetDir, targetDepth) },
    { type: "separator" },
  ];
  if (entry) {
    items.push(
      { label: "Copy", onSelect: () => handlers.onCopy(entry) },
      { label: "Cut", onSelect: () => handlers.onCut(entry) },
    );
  }
  items.push({ label: "Paste", disabled: !canPaste, onSelect: () => handlers.onPaste(targetDir) });
  if (entry) {
    items.push(
      { type: "separator" },
      { label: "Rename", onSelect: () => handlers.onRename(entry, depthOf(entry.path, rootPath)) },
      { label: "Delete", danger: true, onSelect: () => handlers.onDelete(entry) },
    );
  }
  return items;
}

function depthOf(path: string, rootPath: string): number {
  const rel = path.slice(rootPath.length + 1);
  return rel.split("/").length - 1;
}
