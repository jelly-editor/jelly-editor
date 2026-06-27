import { create } from "zustand";

export type PaletteMode = "commands" | "files" | "shortcuts";

interface CommandPaletteState {
  open: boolean;
  mode: PaletteMode;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  openCommands: () => void;
  openFiles: () => void;
  openShortcuts: () => void;
}

export const useCommandPaletteUi = create<CommandPaletteState>((set) => ({
  open: false,
  mode: "commands",
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  openCommands: () => set({ open: true, mode: "commands" }),
  openFiles: () => set({ open: true, mode: "files" }),
  openShortcuts: () => set({ open: true, mode: "shortcuts" }),
}));
