import { create } from "zustand";

export interface Tab {
  path: string;
  name: string;
  isDirty: boolean;
  isPinned: boolean;
  /** Preview tabs are transient: opening another preview reuses the slot. */
  isPreview: boolean;
}

/** The diff currently shown in the editor surface (HEAD ↔ working tree). */
export interface ActiveDiff {
  path: string;
  workspace: string;
}

interface EditorState {
  tabs: Tab[];
  activeTabPath: string | null;
  fileContents: Map<string, string>;
  savedContents: Map<string, string>;
  externallyChanged: Set<string>;
  largeFiles: Set<string>;
  activeDiff: ActiveDiff | null;
  /** A pending request to scroll/select a line in a file (e.g. from search). */
  revealTarget: { path: string; line: number; nonce: number } | null;
  /** Tab awaiting an unsaved-changes confirmation before it closes. */
  closingPath: string | null;

  openPreview: (path: string, name: string) => void;
  openPinned: (path: string, name: string) => void;
  pinTab: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateBuffer: (path: string, content: string) => void;
  setSaved: (path: string, content: string) => void;
  markExternalChange: (path: string) => void;
  clearExternalChange: (path: string) => void;
  markLargeFile: (path: string) => void;
  /** Remap open tabs after a file/folder is renamed or moved on disk.
   *  Handles a folder move by remapping every descendant tab's path prefix. */
  applyRename: (from: string, to: string) => void;
  getContent: (path: string) => string | undefined;
  setActiveDiff: (diff: ActiveDiff | null) => void;
  requestReveal: (path: string, line: number) => void;
  /** Close a tab, prompting first if it has unsaved changes. */
  requestClose: (path: string) => void;
  /** Close the active tab, prompting first if it is dirty. */
  requestCloseActive: () => void;
  /** Dismiss the unsaved-changes prompt without closing. */
  cancelClose: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabPath: null,
  fileContents: new Map(),
  savedContents: new Map(),
  externallyChanged: new Set(),
  largeFiles: new Set(),
  activeDiff: null,
  revealTarget: null,
  closingPath: null,

  openPreview: (path, name) =>
    set((s) => {
      const existing = s.tabs.find((t) => t.path === path);
      if (existing) return { activeTabPath: path };
      const previewIdx = s.tabs.findIndex((t) => t.isPreview && !t.isDirty);
      const newTab: Tab = { path, name, isDirty: false, isPinned: false, isPreview: true };
      const tabs = [...s.tabs];
      if (previewIdx >= 0) tabs[previewIdx] = newTab;
      else tabs.push(newTab);
      return { tabs, activeTabPath: path };
    }),

  openPinned: (path, name) =>
    set((s) => {
      const existing = s.tabs.find((t) => t.path === path);
      if (existing) {
        return {
          tabs: s.tabs.map((t) =>
            t.path === path ? { ...t, isPinned: true, isPreview: false } : t,
          ),
          activeTabPath: path,
        };
      }
      return {
        tabs: [...s.tabs, { path, name, isDirty: false, isPinned: true, isPreview: false }],
        activeTabPath: path,
      };
    }),

  pinTab: (path) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.path === path ? { ...t, isPinned: true, isPreview: false } : t,
      ),
    })),

  closeTab: (path) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.path === path);
      const tabs = s.tabs.filter((t) => t.path !== path);
      let active = s.activeTabPath;
      if (s.activeTabPath === path) {
        active = tabs[idx]?.path ?? tabs[idx - 1]?.path ?? tabs[tabs.length - 1]?.path ?? null;
      }
      const fileContents = new Map(s.fileContents);
      fileContents.delete(path);
      const savedContents = new Map(s.savedContents);
      savedContents.delete(path);
      const externallyChanged = new Set(s.externallyChanged);
      externallyChanged.delete(path);
      const largeFiles = new Set(s.largeFiles);
      largeFiles.delete(path);
      return { tabs, activeTabPath: active, fileContents, savedContents, externallyChanged, largeFiles };
    }),

  setActiveTab: (activeTabPath) => set({ activeTabPath }),

  updateBuffer: (path, content) =>
    set((s) => {
      const fileContents = new Map(s.fileContents);
      fileContents.set(path, content);
      const isDirty = s.savedContents.get(path) !== content;
      return {
        fileContents,
        tabs: s.tabs.map((t) =>
          t.path === path ? { ...t, isDirty, isPreview: false } : t,
        ),
      };
    }),

  setSaved: (path, content) =>
    set((s) => {
      const fileContents = new Map(s.fileContents);
      fileContents.set(path, content);
      const savedContents = new Map(s.savedContents);
      savedContents.set(path, content);
      const externallyChanged = new Set(s.externallyChanged);
      externallyChanged.delete(path);
      return {
        fileContents,
        savedContents,
        externallyChanged,
        tabs: s.tabs.map((t) => (t.path === path ? { ...t, isDirty: false } : t)),
      };
    }),

  markExternalChange: (path) =>
    set((s) => {
      if (!s.tabs.some((t) => t.path === path)) return {};
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
      // Matches the renamed path itself and, for a folder, every descendant.
      const matches = (p: string) => p === from || p.startsWith(from + "/");
      if (!s.tabs.some((t) => matches(t.path))) return {};
      const remap = (p: string) => (matches(p) ? to + p.slice(from.length) : p);
      const basename = (p: string) => p.slice(p.lastIndexOf("/") + 1);
      const moveMap = (m: Map<string, string>) => {
        const next = new Map<string, string>();
        for (const [k, v] of m) next.set(remap(k), v);
        return next;
      };
      const moveSet = (set: Set<string>) => new Set(Array.from(set, remap));
      return {
        tabs: s.tabs.map((t) =>
          matches(t.path) ? { ...t, path: remap(t.path), name: basename(remap(t.path)) } : t,
        ),
        activeTabPath: s.activeTabPath ? remap(s.activeTabPath) : s.activeTabPath,
        fileContents: moveMap(s.fileContents),
        savedContents: moveMap(s.savedContents),
        externallyChanged: moveSet(s.externallyChanged),
        largeFiles: moveSet(s.largeFiles),
      };
    }),

  getContent: (path) => get().fileContents.get(path),

  setActiveDiff: (activeDiff) => set({ activeDiff }),

  requestReveal: (path, line) =>
    set((s) => ({ revealTarget: { path, line, nonce: (s.revealTarget?.nonce ?? 0) + 1 } })),

  requestClose: (path) => {
    const s = get();
    const tab = s.tabs.find((t) => t.path === path);
    if (!tab) return;
    if (tab.isDirty) set({ closingPath: path });
    else s.closeTab(path);
  },

  requestCloseActive: () => {
    const { activeTabPath, requestClose } = get();
    if (activeTabPath) requestClose(activeTabPath);
  },

  cancelClose: () => set({ closingPath: null }),
}));
