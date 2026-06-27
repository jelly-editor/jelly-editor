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
  renameTab: (from: string, to: string, name: string) => void;
  getContent: (path: string) => string | undefined;
  setActiveDiff: (diff: ActiveDiff | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabPath: null,
  fileContents: new Map(),
  savedContents: new Map(),
  externallyChanged: new Set(),
  largeFiles: new Set(),
  activeDiff: null,

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

  renameTab: (from, to, name) =>
    set((s) => {
      if (!s.tabs.some((t) => t.path === from)) return {};
      const move = (m: Map<string, string>) => {
        const next = new Map(m);
        if (next.has(from)) {
          next.set(to, next.get(from)!);
          next.delete(from);
        }
        return next;
      };
      return {
        tabs: s.tabs.map((t) => (t.path === from ? { ...t, path: to, name } : t)),
        activeTabPath: s.activeTabPath === from ? to : s.activeTabPath,
        fileContents: move(s.fileContents),
        savedContents: move(s.savedContents),
      };
    }),

  getContent: (path) => get().fileContents.get(path),

  setActiveDiff: (activeDiff) => set({ activeDiff }),
}));
