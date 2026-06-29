import { create } from "zustand";

export interface Note {
  id: string;
  alias: string;
  path: string;
  createdAt: number;
}

interface NotesStore {
  notes: Note[];
  workspacePath: string | null;
  activeNotePath: string | null;
  setWorkspacePath: (path: string | null) => void;
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
  setActiveNotePath: (path: string | null) => void;
}

export const useNotesStore = create<NotesStore>((set) => ({
  notes: [],
  workspacePath: null,
  activeNotePath: null,
  setWorkspacePath: (path) => set({ workspacePath: path }),
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  setActiveNotePath: (path) => set({ activeNotePath: path }),
}));
