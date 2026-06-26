import { create } from "zustand";

export interface TerminalTab {
  id: string;
  title: string;
}

interface TerminalState {
  terminals: TerminalTab[];
  activeId: string | null;
  visible: boolean;
  height: number;
  /** working directory for new terminals (the workspace root) */
  cwd: string | null;

  addTerminal: () => string;
  removeTerminal: (id: string) => void;
  setActive: (id: string) => void;
  toggleVisible: () => void;
  setVisible: (v: boolean) => void;
  setHeight: (h: number) => void;
  setCwd: (cwd: string | null) => void;
}

let counter = 0;

export const useTerminalStore = create<TerminalState>((set) => ({
  terminals: [],
  activeId: null,
  visible: false,
  height: 240,
  cwd: null,

  addTerminal: () => {
    const id = crypto.randomUUID();
    const title = `Terminal ${++counter}`;
    set((s) => ({ terminals: [...s.terminals, { id, title }], activeId: id }));
    return id;
  },

  removeTerminal: (id) =>
    set((s) => {
      const idx = s.terminals.findIndex((t) => t.id === id);
      const terminals = s.terminals.filter((t) => t.id !== id);
      let activeId = s.activeId;
      if (s.activeId === id) {
        activeId = terminals[idx]?.id ?? terminals[idx - 1]?.id ?? null;
      }
      return { terminals, activeId };
    }),

  setActive: (activeId) => set({ activeId }),
  toggleVisible: () => set((s) => ({ visible: !s.visible })),
  setVisible: (visible) => set({ visible }),
  setHeight: (height) => set({ height }),
  setCwd: (cwd) => set({ cwd }),
}));
