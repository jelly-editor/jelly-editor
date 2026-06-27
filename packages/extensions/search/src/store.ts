import type { SearchFileResult } from "@jelly/sdk";
import { create } from "zustand";

interface SearchState {
  query: string;
  replacement: string;
  showReplace: boolean;
  replacing: boolean;
  caseSensitive: boolean;
  regex: boolean;
  workspacePath: string | null;

  /** id of the in-flight search; results from older ids are ignored */
  searchId: number;
  searching: boolean;
  capped: boolean;
  error: string | null;
  results: SearchFileResult[];
  /** file paths whose result group is collapsed */
  collapsed: Set<string>;
  /** bumped to pull focus into the query input (e.g. on ⌘⇧F) */
  focusNonce: number;

  setQuery: (query: string) => void;
  setReplacement: (replacement: string) => void;
  toggleShowReplace: () => void;
  setReplacing: (replacing: boolean) => void;
  toggleCase: () => void;
  toggleRegex: () => void;
  setWorkspacePath: (path: string | null) => void;

  beginSearch: (id: number) => void;
  addResult: (result: SearchFileResult) => void;
  finishSearch: (id: number, capped: boolean) => void;
  failSearch: (message: string) => void;
  clear: () => void;
  toggleCollapse: (path: string) => void;
  requestFocus: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  replacement: "",
  showReplace: false,
  replacing: false,
  caseSensitive: false,
  regex: false,
  workspacePath: null,

  searchId: 0,
  searching: false,
  capped: false,
  error: null,
  results: [],
  collapsed: new Set(),
  focusNonce: 0,

  setQuery: (query) => set({ query }),
  setReplacement: (replacement) => set({ replacement }),
  toggleShowReplace: () => set((s) => ({ showReplace: !s.showReplace })),
  setReplacing: (replacing) => set({ replacing }),
  toggleCase: () => set((s) => ({ caseSensitive: !s.caseSensitive })),
  toggleRegex: () => set((s) => ({ regex: !s.regex })),
  setWorkspacePath: (workspacePath) => set({ workspacePath }),

  beginSearch: (id) =>
    set({ searchId: id, searching: true, capped: false, error: null, results: [], collapsed: new Set() }),

  addResult: (result) =>
    set((s) => (result.searchId === s.searchId ? { results: [...s.results, result] } : {})),

  finishSearch: (id, capped) =>
    set((s) => (id === s.searchId ? { searching: false, capped } : {})),

  failSearch: (error) => set({ searching: false, error, results: [] }),

  clear: () => set({ results: [], searching: false, capped: false, error: null }),

  toggleCollapse: (path) =>
    set((s) => {
      const collapsed = new Set(s.collapsed);
      if (collapsed.has(path)) collapsed.delete(path);
      else collapsed.add(path);
      return { collapsed };
    }),

  requestFocus: () => set((s) => ({ focusNonce: s.focusNonce + 1 })),
}));
