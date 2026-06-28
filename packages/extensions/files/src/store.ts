import type { DirEntry, FileStatus } from "@jelly/sdk";
import { create } from "zustand";

export type { DirEntry, FileStatus };

/** Re-list of a directory only returns one level, so carry over the already
 *  loaded `children` of any subfolder that still exists (matched by path).
 *  Without this, refreshing a dir collapses every expanded folder beneath it. */
function mergeChildren(prev: DirEntry[] | undefined, next: DirEntry[]): DirEntry[] {
  if (!prev?.length) return next;
  const prevByPath = new Map(prev.map((n) => [n.path, n]));
  return next.map((n) => {
    const old = prevByPath.get(n.path);
    return n.isDir && old?.children !== undefined ? { ...n, children: old.children } : n;
  });
}

/** Immutably attach `children` to the directory node at `parentPath`,
 *  preserving any loaded subtrees that survive the refresh. */
function attachChildren(
  nodes: DirEntry[],
  parentPath: string,
  children: DirEntry[],
): DirEntry[] {
  return nodes.map((node) => {
    if (node.path === parentPath) return { ...node, children: mergeChildren(node.children, children) };
    if (node.isDir && node.children && parentPath.startsWith(node.path + "/")) {
      return { ...node, children: attachChildren(node.children, parentPath, children) };
    }
    return node;
  });
}

interface WorkspaceState {
  path: string | null;
  tree: DirEntry[];
  /** Flat, recursive index of every workspace file, loaded async after open.
   *  Backs "Go to File" so it can match files in unexpanded folders. */
  allFiles: DirEntry[];
  expandedDirs: Set<string>;
  /** path of the file active in the editor — drives the tree highlight.
   *  Updated from the editor via the `editor:active_changed` event. */
  activeFilePath: string | null;
  /** absolute path → git status, from the git extension's `git:status_changed`. */
  gitStatuses: Record<string, FileStatus>;
  /** Explorer selection — the set of highlighted entries (Cmd-click to extend). */
  selected: Set<string>;

  setWorkspace: (path: string, tree: DirEntry[]) => void;
  setAllFiles: (files: DirEntry[]) => void;
  setGitStatuses: (statuses: Record<string, FileStatus>) => void;
  clearWorkspace: () => void;
  setChildren: (parentPath: string, children: DirEntry[]) => void;
  setExpanded: (path: string, expanded: boolean) => void;
  setActiveFilePath: (path: string | null) => void;
  setSelection: (paths: string[]) => void;
  toggleSelection: (path: string) => void;
  clearSelection: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  path: null,
  tree: [],
  allFiles: [],
  expandedDirs: new Set(),
  activeFilePath: null,
  gitStatuses: {},
  selected: new Set(),

  setWorkspace: (path, tree) =>
    set({ path, tree, allFiles: [], expandedDirs: new Set(), selected: new Set() }),

  setAllFiles: (allFiles) => set({ allFiles }),

  setGitStatuses: (gitStatuses) => set({ gitStatuses }),

  clearWorkspace: () =>
    set({ path: null, tree: [], allFiles: [], expandedDirs: new Set(), gitStatuses: {}, selected: new Set() }),

  setChildren: (parentPath, children) =>
    set((s) =>
      parentPath === s.path
        ? { tree: mergeChildren(s.tree, children) }
        : { tree: attachChildren(s.tree, parentPath, children) },
    ),

  setExpanded: (path, expanded) =>
    set((s) => {
      const next = new Set(s.expandedDirs);
      expanded ? next.add(path) : next.delete(path);
      return { expandedDirs: next };
    }),

  setActiveFilePath: (activeFilePath) => set({ activeFilePath }),

  setSelection: (paths) => set({ selected: new Set(paths) }),

  toggleSelection: (path) =>
    set((s) => {
      const next = new Set(s.selected);
      next.has(path) ? next.delete(path) : next.add(path);
      return { selected: next };
    }),

  clearSelection: () => set({ selected: new Set() }),
}));
