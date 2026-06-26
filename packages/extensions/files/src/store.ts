import type { DirEntry } from "@jelly/sdk";
import { create } from "zustand";

export type { DirEntry };

/** Immutably attach `children` to the directory node at `parentPath`. */
function attachChildren(
  nodes: DirEntry[],
  parentPath: string,
  children: DirEntry[],
): DirEntry[] {
  return nodes.map((node) => {
    if (node.path === parentPath) return { ...node, children };
    if (node.isDir && node.children && parentPath.startsWith(node.path + "/")) {
      return { ...node, children: attachChildren(node.children, parentPath, children) };
    }
    return node;
  });
}

interface WorkspaceState {
  path: string | null;
  tree: DirEntry[];
  expandedDirs: Set<string>;
  /** path of the file active in the editor — drives the tree highlight.
   *  Updated from the editor via the `editor:active_changed` event. */
  activeFilePath: string | null;

  setWorkspace: (path: string, tree: DirEntry[]) => void;
  clearWorkspace: () => void;
  setChildren: (parentPath: string, children: DirEntry[]) => void;
  setExpanded: (path: string, expanded: boolean) => void;
  setActiveFilePath: (path: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  path: null,
  tree: [],
  expandedDirs: new Set(),
  activeFilePath: null,

  setWorkspace: (path, tree) => set({ path, tree, expandedDirs: new Set() }),

  clearWorkspace: () => set({ path: null, tree: [], expandedDirs: new Set() }),

  setChildren: (parentPath, children) =>
    set((s) =>
      parentPath === s.path
        ? { tree: children }
        : { tree: attachChildren(s.tree, parentPath, children) },
    ),

  setExpanded: (path, expanded) =>
    set((s) => {
      const next = new Set(s.expandedDirs);
      expanded ? next.add(path) : next.delete(path);
      return { expandedDirs: next };
    }),

  setActiveFilePath: (activeFilePath) => set({ activeFilePath }),
}));
