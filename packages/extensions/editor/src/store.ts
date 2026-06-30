import type { ReactNode } from "react";
import { create } from "zustand";

export interface Tab {
  /** Unique key within the editor: a file path, or `view:<type>:<id>`. */
  path: string;
  name: string;
  isDirty: boolean;
  isPinned: boolean;
  /** Preview tabs are transient: opening another preview reuses the slot. */
  isPreview: boolean;
  /** Non-file tabs (e.g. a terminal) render a contributed view instead. */
  kind?: "file" | "view";
  viewType?: string;
  viewId?: string;
}

/** Renders a contributed pane view (e.g. a terminal) for a given instance. */
export type ViewRenderer = (viewId: string, opts: { active: boolean }) => ReactNode;

export const viewPath = (viewType: string, viewId: string) => `view:${viewType}:${viewId}`;

/** The diff currently shown in a pane (HEAD ↔ working tree). */
export interface ActiveDiff {
  path: string;
  workspace: string;
}

/** A single editor pane: its own tab bar, active file and optional diff. */
export interface Pane {
  id: string;
  tabs: Tab[];
  activeTabPath: string | null;
  activeDiff: ActiveDiff | null;
}

/** The panes are arranged in a binary-ish split tree (nested rows/columns). */
export type LayoutNode =
  | { type: "leaf"; paneId: string }
  | { type: "split"; id: string; dir: "row" | "column"; children: LayoutNode[]; sizes: number[] };

export type Side = "left" | "right" | "top" | "bottom";

let paneSeq = 0;
export const newPaneId = () => `pane-${++paneSeq}`;
let splitSeq = 0;
const newSplitId = () => `split-${++splitSeq}`;

const emptyPane = (): Pane => ({ id: newPaneId(), tabs: [], activeTabPath: null, activeDiff: null });
const leaf = (paneId: string): LayoutNode => ({ type: "leaf", paneId });

const sideDir = (s: Side): "row" | "column" => (s === "left" || s === "right" ? "row" : "column");
const sideBefore = (s: Side): boolean => s === "left" || s === "top";

// ── Pure layout-tree helpers ────────────────────────────────────────────────

/** Split the leaf for `targetId`, inserting `newId` on `side`. Sibling leaves of
 *  a matching-direction split are kept flat; otherwise the leaf is wrapped. */
function splitLeaf(node: LayoutNode, targetId: string, newId: string, side: Side): LayoutNode {
  const dir = sideDir(side);
  const before = sideBefore(side);
  if (node.type === "leaf") {
    if (node.paneId !== targetId) return node;
    const children = before ? [leaf(newId), node] : [node, leaf(newId)];
    return { type: "split", id: newSplitId(), dir, children, sizes: [1, 1] };
  }
  const idx = node.children.findIndex((c) => c.type === "leaf" && c.paneId === targetId);
  if (idx >= 0 && node.dir === dir) {
    const insertAt = before ? idx : idx + 1;
    const children = [...node.children];
    children.splice(insertAt, 0, leaf(newId));
    const share = node.sizes[idx] / 2;
    const sizes = [...node.sizes];
    sizes[idx] = share;
    sizes.splice(insertAt, 0, share);
    return { ...node, children, sizes };
  }
  return { ...node, children: node.children.map((c) => splitLeaf(c, targetId, newId, side)) };
}

/** Add `newId` as a pane at the outer edge of the whole tree. */
function splitRoot(root: LayoutNode, newId: string, side: Side): LayoutNode {
  const dir = sideDir(side);
  const before = sideBefore(side);
  if (root.type === "split" && root.dir === dir) {
    const avg = root.sizes.reduce((a, b) => a + b, 0) / root.sizes.length;
    const children = before ? [leaf(newId), ...root.children] : [...root.children, leaf(newId)];
    const sizes = before ? [avg, ...root.sizes] : [...root.sizes, avg];
    return { ...root, children, sizes };
  }
  const children = before ? [leaf(newId), root] : [root, leaf(newId)];
  return { type: "split", id: newSplitId(), dir, children, sizes: [1, 1] };
}

/** Remove a leaf, collapsing any split left with a single child. */
function removeLeaf(node: LayoutNode, paneId: string): LayoutNode | null {
  if (node.type === "leaf") return node.paneId === paneId ? null : node;
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((c, i) => {
    const r = removeLeaf(c, paneId);
    if (r) {
      children.push(r);
      sizes.push(node.sizes[i]);
    }
  });
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { ...node, children, sizes };
}

function setSizes(node: LayoutNode, splitId: string, sizes: number[]): LayoutNode {
  if (node.type === "leaf") return node;
  if (node.id === splitId) return { ...node, sizes };
  return { ...node, children: node.children.map((c) => setSizes(c, splitId, sizes)) };
}

export function leafIds(node: LayoutNode): string[] {
  return node.type === "leaf" ? [node.paneId] : node.children.flatMap(leafIds);
}

function firstLeafId(node: LayoutNode): string {
  return node.type === "leaf" ? node.paneId : firstLeafId(node.children[0]);
}

function isViewOnlyPane(pane: Pane): boolean {
  return pane.tabs.length > 0 && pane.tabs.every((t) => t.kind === "view") && !pane.activeDiff;
}

/** Pick the next active path after removing `path` from a tab list. */
function nextActive(prev: Tab[], removed: string, current: string | null): string | null {
  if (current !== removed) return current;
  const idx = prev.findIndex((t) => t.path === removed);
  const left = prev.filter((t) => t.path !== removed);
  return left[idx]?.path ?? left[idx - 1]?.path ?? left[left.length - 1]?.path ?? null;
}

interface EditorState {
  root: LayoutNode;
  panes: Record<string, Pane>;
  activePaneId: string;
  fileContents: Map<string, string>;
  savedContents: Map<string, string>;
  externallyChanged: Set<string>;
  largeFiles: Set<string>;
  /** A pending request to scroll/select a line in a file (e.g. from search). */
  revealTarget: { path: string; line: number; nonce: number } | null;
  /** Tab awaiting an unsaved-changes confirmation before it closes. */
  closing: { paneId: string; path: string } | null;
  /** Contributed renderers for `view` tabs, keyed by view type. */
  viewRenderers: Map<string, ViewRenderer>;
  /** Bumped when a renderer registers so mounted view hosts re-render. */
  viewVersion: number;
  hiddenPaneIds: Set<string>;
  /** Pane currently under a file drag, plus the edge being targeted (null = center). */
  dragOver: { paneId: string; side: Side | null } | null;
  /** Paths currently shown as rendered markdown (toggled by editor.toggleMarkdownPreview). */
  mdPreviewPaths: Set<string>;

  toggleMdPreview: (path: string) => void;
  getActivePane: () => Pane;
  setDragOver: (v: { paneId: string; side: Side | null } | null) => void;
  /** Open a fresh pane split off `targetPaneId` on `side`, and make it active. */
  splitOpen: (targetPaneId: string, side: Side) => void;

  /** Register a renderer for a `view` tab type (called via the command bus). */
  registerView: (viewType: string, render: ViewRenderer) => void;
  /**
   * Open a contributed view as a tab. `placement` "active" drops it in the
   * focused pane; "group-bottom" groups it with same-type views in a dedicated
   * bottom pane (how terminals open by default).
   */
  openView: (viewType: string, viewId: string, title: string, placement?: "active" | "group-bottom") => void;
  toggleViewType: (viewType: string) => boolean;

  openPreview: (path: string, name: string) => void;
  openPinned: (path: string, name: string) => void;
  /** Open a file in a specific pane, used by explicit drag/drop targets. */
  openPinnedInPane: (paneId: string, path: string, name: string) => void;
  pinTab: (paneId: string, path: string) => void;
  unpinTab: (paneId: string, path: string) => void;
  closeTab: (paneId: string, path: string) => void;
  /** Close a path in every pane (e.g. after it is deleted on disk). */
  closeEverywhere: (path: string) => void;
  setActiveTab: (paneId: string, path: string) => void;
  setActivePane: (paneId: string) => void;
  updateBuffer: (path: string, content: string) => void;
  setSaved: (path: string, content: string) => void;
  markExternalChange: (path: string) => void;
  clearExternalChange: (path: string) => void;
  markLargeFile: (path: string) => void;
  applyRename: (from: string, to: string) => void;
  getContent: (path: string) => string | undefined;
  openDiff: (diff: ActiveDiff) => void;
  closeDiff: (paneId: string) => void;
  requestReveal: (path: string, line: number) => void;
  requestClose: (paneId: string, path: string) => void;
  requestCloseActive: () => void;
  cancelClose: () => void;
  /** Split the active pane's active tab into a new pane (right or down). */
  splitActive: (direction: "right" | "down") => void;
  /** Split a specific tab into a new pane beside its own pane. */
  splitTab: (paneId: string, path: string, direction: "right" | "down") => void;
  /** Drag: move a tab into the body of another pane. */
  moveTab: (fromPaneId: string, toPaneId: string, path: string) => void;
  /** Drag: drop a tab on a pane's edge, splitting that pane. */
  dropTabOnPaneEdge: (fromPaneId: string, path: string, targetPaneId: string, side: Side) => void;
  /** Resize the children of a split (drag the handle between two siblings). */
  setSplitSizes: (splitId: string, sizes: number[]) => void;
}

export const useEditorStore = create<EditorState>((set, get) => {
  const active = (s: EditorState) => s.panes[s.activePaneId] ?? s.panes[firstLeafId(s.root)];

  /** Drop shared buffer state for a path once no pane has it open. */
  const pruneContent = (
    s: EditorState,
    panes: Record<string, Pane>,
    path: string,
  ): Partial<EditorState> => {
    if (Object.values(panes).some((p) => p.tabs.some((t) => t.path === path))) return {};
    const fileContents = new Map(s.fileContents);
    fileContents.delete(path);
    const savedContents = new Map(s.savedContents);
    savedContents.delete(path);
    const externallyChanged = new Set(s.externallyChanged);
    externallyChanged.delete(path);
    const largeFiles = new Set(s.largeFiles);
    largeFiles.delete(path);
    return { fileContents, savedContents, externallyChanged, largeFiles };
  };

  /** Remove a pane (leaf + record). The last pane is emptied, never removed. */
  const dropPane = (s: EditorState, root: LayoutNode, panes: Record<string, Pane>, paneId: string) => {
    if (leafIds(root).length <= 1) {
      return {
        root,
        panes: { ...panes, [paneId]: { id: paneId, tabs: [], activeTabPath: null, activeDiff: null } },
        activePaneId: paneId,
      };
    }
    const nextRoot = removeLeaf(root, paneId)!;
    const nextPanes = { ...panes };
    delete nextPanes[paneId];
    const activePaneId = s.activePaneId === paneId ? firstLeafId(nextRoot) : s.activePaneId;
    return { root: nextRoot, panes: nextPanes, activePaneId };
  };

  const fileTarget = (s: EditorState): { root: LayoutNode; panes: Record<string, Pane>; pane: Pane } => {
    const pane = active(s);
    if (!isViewOnlyPane(pane)) return { root: s.root, panes: s.panes, pane };

    const visibleFilePaneId = leafIds(s.root).find((id) => {
      const p = s.panes[id];
      return p && !s.hiddenPaneIds.has(id) && !isViewOnlyPane(p);
    });
    if (visibleFilePaneId) return { root: s.root, panes: s.panes, pane: s.panes[visibleFilePaneId] };

    const np = emptyPane();
    const newRoot: LayoutNode = {
      type: "split",
      id: newSplitId(),
      dir: "column",
      children: [leaf(np.id), s.root],
      sizes: [0.72, 0.28],
    };
    return {
      root: newRoot,
      panes: { ...s.panes, [np.id]: np },
      pane: np,
    };
  };

  const init = emptyPane();

  return {
    root: leaf(init.id),
    panes: { [init.id]: init },
    activePaneId: init.id,
    fileContents: new Map(),
    savedContents: new Map(),
    externallyChanged: new Set(),
    largeFiles: new Set(),
    revealTarget: null,
    closing: null,
    viewRenderers: new Map(),
    viewVersion: 0,
    hiddenPaneIds: new Set(),
    dragOver: null,
    mdPreviewPaths: new Set(),

    toggleMdPreview: (path) =>
      set((s) => {
        const mdPreviewPaths = new Set(s.mdPreviewPaths);
        if (mdPreviewPaths.has(path)) mdPreviewPaths.delete(path);
        else mdPreviewPaths.add(path);
        return { mdPreviewPaths };
      }),
    getActivePane: () => active(get()),
    setDragOver: (dragOver) => set({ dragOver }),
    splitOpen: (targetPaneId, side) =>
      set((s) => {
        const np = emptyPane();
        return {
          root: splitLeaf(s.root, targetPaneId, np.id, side),
          panes: { ...s.panes, [np.id]: np },
          activePaneId: np.id,
        };
      }),

    registerView: (viewType, render) =>
      set((s) => {
        s.viewRenderers.set(viewType, render);
        return { viewVersion: s.viewVersion + 1 };
      }),

    openView: (viewType, viewId, title, placement = "active") =>
      set((s) => {
        const path = viewPath(viewType, viewId);
        const open = Object.values(s.panes).find((p) => p.tabs.some((t) => t.path === path));
        if (open) {
          const hiddenPaneIds = new Set(s.hiddenPaneIds);
          hiddenPaneIds.delete(open.id);
          return {
            panes: { ...s.panes, [open.id]: { ...open, activeTabPath: path, activeDiff: null } },
            activePaneId: open.id,
            hiddenPaneIds,
          };
        }
        const tab: Tab = { path, name: title, isDirty: false, isPinned: false, isPreview: false, kind: "view", viewType, viewId };
        const addTo = (pane: Pane): Partial<EditorState> => {
          const hiddenPaneIds = new Set(s.hiddenPaneIds);
          hiddenPaneIds.delete(pane.id);
          return {
            panes: { ...s.panes, [pane.id]: { ...pane, tabs: [...pane.tabs, tab], activeTabPath: path, activeDiff: null } },
            activePaneId: pane.id,
            hiddenPaneIds,
          };
        };

        if (placement === "group-bottom") {
          const group = Object.values(s.panes).find((p) => p.tabs.some((t) => t.kind === "view" && t.viewType === viewType));
          if (group) return addTo(group);
          const np: Pane = { ...emptyPane(), tabs: [tab], activeTabPath: path };

          // If the current layout is a single empty pane, discard it rather than
          // leaving a phantom "Open a file" pane above the terminal. A code pane
          // will be created on demand by fileTarget when the user opens a file.
          if (s.root.type === "leaf") {
            const sole = s.panes[s.root.paneId];
            if (sole && sole.tabs.length === 0 && !sole.activeDiff) {
              const panes = { ...s.panes };
              delete panes[s.root.paneId];
              panes[np.id] = np;
              return { root: leaf(np.id), panes, activePaneId: np.id };
            }
          }

          const root: LayoutNode =
            s.root.type === "split" && s.root.dir === "column"
              ? {
                  ...s.root,
                  children: [...s.root.children, leaf(np.id)],
                  sizes: [...s.root.sizes, s.root.sizes.reduce((a, b) => a + b, 0) / s.root.sizes.length],
                }
              : { type: "split", id: newSplitId(), dir: "column", children: [s.root, leaf(np.id)], sizes: [0.72, 0.28] };
          return { root, panes: { ...s.panes, [np.id]: np }, activePaneId: np.id };
        }

        return addTo(active(s));
      }),

    toggleViewType: (viewType) => {
      const state = get();
      const panesWithView = Object.values(state.panes).filter((pane) =>
        pane.tabs.some((tab) => tab.kind === "view" && tab.viewType === viewType),
      );
      if (panesWithView.length === 0) return false;

      const viewPathIn = (pane: Pane) =>
        pane.tabs.find((tab) => tab.kind === "view" && tab.viewType === viewType)?.path;

      const activePane = state.panes[state.activePaneId];
      const activeViewPath = activePane ? viewPathIn(activePane) : undefined;
      const activePaneShowsView =
        activePane &&
        !state.hiddenPaneIds.has(activePane.id) &&
        activePane.activeTabPath === activeViewPath;

      if (activePaneShowsView) {
        const visibleIds = leafIds(state.root).filter(
          (id) => id !== activePane.id && !state.hiddenPaneIds.has(id),
        );
        if (visibleIds.length === 0) return true;

        set({
          hiddenPaneIds: new Set([...state.hiddenPaneIds, activePane.id]),
          activePaneId: visibleIds[0],
        });
        return true;
      }

      const target =
        panesWithView.find((pane) => !state.hiddenPaneIds.has(pane.id)) ??
        panesWithView.find((pane) => state.hiddenPaneIds.has(pane.id));
      if (!target) return false;

      const path = viewPathIn(target);
      if (!path) return false;
      const hiddenPaneIds = new Set(state.hiddenPaneIds);
      hiddenPaneIds.delete(target.id);
      set({
        hiddenPaneIds,
        activePaneId: target.id,
        panes: {
          ...state.panes,
          [target.id]: { ...target, activeTabPath: path, activeDiff: null },
        },
      });
      return true;
    },

    openPreview: (path, name) =>
      set((s) => {
        const target = fileTarget(s);
        const pane = target.pane;
        if (pane.tabs.some((t) => t.path === path)) {
          return {
            root: target.root,
            panes: { ...target.panes, [pane.id]: { ...pane, activeTabPath: path, activeDiff: null } },
            activePaneId: pane.id,
          };
        }
        const previewIdx = pane.tabs.findIndex((t) => t.isPreview && !t.isDirty);
        const nt: Tab = { path, name, isDirty: false, isPinned: false, isPreview: true };
        const tabs = [...pane.tabs];
        if (previewIdx >= 0) tabs[previewIdx] = nt;
        else tabs.push(nt);
        return {
          root: target.root,
          panes: { ...target.panes, [pane.id]: { ...pane, tabs, activeTabPath: path, activeDiff: null } },
          activePaneId: pane.id,
        };
      }),

    openPinned: (path, name) =>
      set((s) => {
        const target = fileTarget(s);
        const pane = target.pane;
        if (pane.tabs.some((t) => t.path === path)) {
          return {
            root: target.root,
            panes: {
              ...target.panes,
              [pane.id]: {
                ...pane,
                tabs: pane.tabs.map((t) =>
                  t.path === path ? { ...t, isPinned: true, isPreview: false } : t,
                ),
                activeTabPath: path,
                activeDiff: null,
              },
            },
            activePaneId: pane.id,
          };
        }
        return {
          root: target.root,
          panes: {
            ...target.panes,
            [pane.id]: {
              ...pane,
              tabs: [...pane.tabs, { path, name, isDirty: false, isPinned: true, isPreview: false }],
              activeTabPath: path,
              activeDiff: null,
            },
          },
          activePaneId: pane.id,
        };
      }),

    openPinnedInPane: (paneId, path, name) =>
      set((s) => {
        const pane = s.panes[paneId];
        if (!pane) return {};
        const hiddenPaneIds = new Set(s.hiddenPaneIds);
        hiddenPaneIds.delete(paneId);
        if (pane.tabs.some((t) => t.path === path)) {
          return {
            panes: {
              ...s.panes,
              [paneId]: {
                ...pane,
                tabs: pane.tabs.map((t) =>
                  t.path === path ? { ...t, isPinned: true, isPreview: false } : t,
                ),
                activeTabPath: path,
                activeDiff: null,
              },
            },
            activePaneId: paneId,
            hiddenPaneIds,
          };
        }
        return {
          panes: {
            ...s.panes,
            [paneId]: {
              ...pane,
              tabs: [...pane.tabs, { path, name, isDirty: false, isPinned: true, isPreview: false }],
              activeTabPath: path,
              activeDiff: null,
            },
          },
          activePaneId: paneId,
          hiddenPaneIds,
        };
      }),

    pinTab: (paneId, path) =>
      set((s) => {
        const pane = s.panes[paneId];
        if (!pane) return {};
        return {
          panes: {
            ...s.panes,
            [paneId]: {
              ...pane,
              tabs: pane.tabs.map((t) =>
                t.path === path ? { ...t, isPinned: true, isPreview: false } : t,
              ),
            },
          },
        };
      }),

    unpinTab: (paneId, path) =>
      set((s) => {
        const pane = s.panes[paneId];
        if (!pane) return {};
        return {
          panes: {
            ...s.panes,
            [paneId]: {
              ...pane,
              tabs: pane.tabs.map((t) =>
                t.path === path ? { ...t, isPinned: false } : t,
              ),
            },
          },
        };
      }),

    closeTab: (paneId, path) =>
      set((s) => {
        const pane = s.panes[paneId];
        if (!pane) return {};
        const tabs = pane.tabs.filter((t) => t.path !== path);
        const updated: Pane = { ...pane, tabs, activeTabPath: nextActive(pane.tabs, path, pane.activeTabPath) };
        let root = s.root;
        let panes = { ...s.panes, [paneId]: updated };
        let activePaneId = s.activePaneId;
        if (tabs.length === 0 && !updated.activeDiff) {
          ({ root, panes, activePaneId } = dropPane(s, root, panes, paneId));
        }
        const hiddenPaneIds = new Set(s.hiddenPaneIds);
        if (!panes[paneId]) hiddenPaneIds.delete(paneId);
        return { root, panes, activePaneId, hiddenPaneIds, ...pruneContent(s, panes, path) };
      }),

    closeEverywhere: (path) =>
      set((s) => {
        let panes = { ...s.panes };
        for (const id of Object.keys(panes)) {
          const p = panes[id];
          if (p.tabs.some((t) => t.path === path)) {
            panes[id] = { ...p, tabs: p.tabs.filter((t) => t.path !== path), activeTabPath: nextActive(p.tabs, path, p.activeTabPath) };
          }
        }
        let root = s.root;
        for (const id of Object.keys(panes)) {
          const p = panes[id];
          if (p.tabs.length === 0 && !p.activeDiff && leafIds(root).length > 1) {
            root = removeLeaf(root, id)!;
            delete panes[id];
          }
        }
        const activePaneId = panes[s.activePaneId] ? s.activePaneId : firstLeafId(root);
        const hiddenPaneIds = new Set([...s.hiddenPaneIds].filter((id) => panes[id]));
        return { root, panes, activePaneId, hiddenPaneIds, ...pruneContent(s, panes, path) };
      }),

    setActiveTab: (paneId, path) =>
      set((s) => {
        const pane = s.panes[paneId];
        if (!pane) return {};
        return { panes: { ...s.panes, [paneId]: { ...pane, activeTabPath: path, activeDiff: null } } };
      }),

    setActivePane: (activePaneId) =>
      set((s) => {
        const hiddenPaneIds = new Set(s.hiddenPaneIds);
        hiddenPaneIds.delete(activePaneId);
        return { activePaneId, hiddenPaneIds };
      }),

    updateBuffer: (path, content) =>
      set((s) => {
        const fileContents = new Map(s.fileContents);
        fileContents.set(path, content);
        const isDirty = s.savedContents.get(path) !== content;
        const panes = { ...s.panes };
        for (const id of Object.keys(panes)) {
          const p = panes[id];
          if (p.tabs.some((t) => t.path === path)) {
            panes[id] = { ...p, tabs: p.tabs.map((t) => (t.path === path ? { ...t, isDirty, isPreview: false } : t)) };
          }
        }
        return { fileContents, panes };
      }),

    setSaved: (path, content) =>
      set((s) => {
        const fileContents = new Map(s.fileContents);
        fileContents.set(path, content);
        const savedContents = new Map(s.savedContents);
        savedContents.set(path, content);
        const externallyChanged = new Set(s.externallyChanged);
        externallyChanged.delete(path);
        const panes = { ...s.panes };
        for (const id of Object.keys(panes)) {
          const p = panes[id];
          if (p.tabs.some((t) => t.path === path)) {
            panes[id] = { ...p, tabs: p.tabs.map((t) => (t.path === path ? { ...t, isDirty: false } : t)) };
          }
        }
        return { fileContents, savedContents, externallyChanged, panes };
      }),

    markExternalChange: (path) =>
      set((s) => {
        if (!Object.values(s.panes).some((p) => p.tabs.some((t) => t.path === path))) return {};
        const externallyChanged = new Set(s.externallyChanged);
        externallyChanged.add(path);
        return { externallyChanged };
      }),

    clearExternalChange: (path) =>
      set((s) => {
        const externallyChanged = new Set(s.externallyChanged);
        externallyChanged.delete(path);
        return { externallyChanged };
      }),

    markLargeFile: (path) =>
      set((s) => {
        const largeFiles = new Set(s.largeFiles);
        largeFiles.add(path);
        return { largeFiles };
      }),

    applyRename: (from, to) =>
      set((s) => {
        const matches = (p: string) => p === from || p.startsWith(from + "/");
        if (!Object.values(s.panes).some((p) => p.tabs.some((t) => matches(t.path)))) return {};
        const remap = (p: string) => (matches(p) ? to + p.slice(from.length) : p);
        const basename = (p: string) => p.slice(p.lastIndexOf("/") + 1);
        const moveMap = (m: Map<string, string>) => {
          const next = new Map<string, string>();
          for (const [k, v] of m) next.set(remap(k), v);
          return next;
        };
        const moveSet = (st: Set<string>) => new Set(Array.from(st, remap));
        const panes = { ...s.panes };
        for (const id of Object.keys(panes)) {
          const p = panes[id];
          panes[id] = {
            ...p,
            tabs: p.tabs.map((t) =>
              matches(t.path) ? { ...t, path: remap(t.path), name: basename(remap(t.path)) } : t,
            ),
            activeTabPath: p.activeTabPath ? remap(p.activeTabPath) : p.activeTabPath,
          };
        }
        return {
          panes,
          fileContents: moveMap(s.fileContents),
          savedContents: moveMap(s.savedContents),
          externallyChanged: moveSet(s.externallyChanged),
          largeFiles: moveSet(s.largeFiles),
        };
      }),

    getContent: (path) => get().fileContents.get(path),

    openDiff: (diff) =>
      set((s) => {
        const existing = Object.values(s.panes).find((p) => p.activeDiff);
        if (existing) {
          return { panes: { ...s.panes, [existing.id]: { ...existing, activeDiff: diff } }, activePaneId: existing.id };
        }
        const pane = active(s);
        if (leafIds(s.root).length === 1 && pane.tabs.length === 0) {
          return { panes: { ...s.panes, [pane.id]: { ...pane, activeDiff: diff } }, activePaneId: pane.id };
        }
        const np: Pane = { ...emptyPane(), activeDiff: diff };
        return { root: splitRoot(s.root, np.id, "right"), panes: { ...s.panes, [np.id]: np }, activePaneId: np.id };
      }),

    closeDiff: (paneId) =>
      set((s) => {
        const pane = s.panes[paneId];
        if (!pane) return {};
        if (pane.tabs.length === 0) return dropPane(s, s.root, s.panes, paneId);
        return { panes: { ...s.panes, [paneId]: { ...pane, activeDiff: null } } };
      }),

    requestReveal: (path, line) =>
      set((s) => ({ revealTarget: { path, line, nonce: (s.revealTarget?.nonce ?? 0) + 1 } })),

    requestClose: (paneId, path) => {
      const s = get();
      const tab = s.panes[paneId]?.tabs.find((t) => t.path === path);
      if (!tab || tab.isPinned) return;
      if (tab.isDirty) set({ closing: { paneId, path } });
      else s.closeTab(paneId, path);
    },

    requestCloseActive: () => {
      const s = get();
      const pane = active(s);
      if (pane.activeDiff) s.closeDiff(pane.id);
      else if (pane.activeTabPath) s.requestClose(pane.id, pane.activeTabPath);
    },

    cancelClose: () => set({ closing: null }),

    splitActive: (direction) => {
      const s = get();
      const pane = active(s);
      if (pane.activeTabPath) s.splitTab(pane.id, pane.activeTabPath, direction);
    },

    splitTab: (paneId, path, direction) =>
      set((s) => {
        const src = s.panes[paneId];
        const tab = src?.tabs.find((t) => t.path === path);
        if (!src || !tab) return {};
        const side: Side = direction === "down" ? "bottom" : "right";
        const np: Pane = { ...emptyPane(), tabs: [{ ...tab, isPreview: false }], activeTabPath: path };
        const updated: Pane = { ...src, tabs: src.tabs.filter((t) => t.path !== path), activeTabPath: nextActive(src.tabs, path, src.activeTabPath) };
        return {
          root: splitLeaf(s.root, paneId, np.id, side),
          panes: { ...s.panes, [paneId]: updated, [np.id]: np },
          activePaneId: np.id,
        };
      }),

    moveTab: (fromPaneId, toPaneId, path) =>
      set((s) => {
        if (fromPaneId === toPaneId) return {};
        const sp = s.panes[fromPaneId];
        const tp = s.panes[toPaneId];
        const tab = sp?.tabs.find((t) => t.path === path);
        if (!sp || !tp || !tab) return {};
        const source: Pane = { ...sp, tabs: sp.tabs.filter((t) => t.path !== path), activeTabPath: nextActive(sp.tabs, path, sp.activeTabPath) };
        const target: Pane = tp.tabs.some((t) => t.path === path)
          ? { ...tp, activeTabPath: path, activeDiff: null }
          : { ...tp, tabs: [...tp.tabs, { ...tab, isPreview: false }], activeTabPath: path, activeDiff: null };
        let root = s.root;
        const panes = { ...s.panes, [fromPaneId]: source, [toPaneId]: target };
        if (source.tabs.length === 0 && !source.activeDiff && leafIds(root).length > 1) {
          root = removeLeaf(root, fromPaneId)!;
          delete panes[fromPaneId];
        }
        const hiddenPaneIds = new Set(s.hiddenPaneIds);
        hiddenPaneIds.delete(fromPaneId);
        hiddenPaneIds.delete(toPaneId);
        return { root, panes, activePaneId: toPaneId, hiddenPaneIds };
      }),

    dropTabOnPaneEdge: (fromPaneId, path, targetPaneId, side) =>
      set((s) => {
        const sp = s.panes[fromPaneId];
        const tab = sp?.tabs.find((t) => t.path === path);
        if (!sp || !tab) return {};
        const np: Pane = { ...emptyPane(), tabs: [{ ...tab, isPreview: false }], activeTabPath: path };
        const source: Pane = { ...sp, tabs: sp.tabs.filter((t) => t.path !== path), activeTabPath: nextActive(sp.tabs, path, sp.activeTabPath) };
        let root = splitLeaf(s.root, targetPaneId, np.id, side);
        const panes = { ...s.panes, [fromPaneId]: source, [np.id]: np };
        if (source.tabs.length === 0 && !source.activeDiff) {
          root = removeLeaf(root, fromPaneId)!;
          delete panes[fromPaneId];
        }
        const hiddenPaneIds = new Set(s.hiddenPaneIds);
        hiddenPaneIds.delete(fromPaneId);
        hiddenPaneIds.delete(np.id);
        return { root, panes, activePaneId: np.id, hiddenPaneIds };
      }),

    setSplitSizes: (splitId, sizes) => set((s) => ({ root: setSizes(s.root, splitId, sizes) })),
  };
});
