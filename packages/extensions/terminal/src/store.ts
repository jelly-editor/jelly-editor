import { create } from "zustand";

interface TerminalState {
  /** Working directory for new terminals (the workspace root). */
  cwd: string | null;
  setCwd: (cwd: string | null) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  cwd: null,
  setCwd: (cwd) => set({ cwd }),
}));
