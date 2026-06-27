import { create } from "zustand";

interface CommandPaletteState {
  open: boolean;
  /** the provider the palette opens to (a typed prefix can switch within it) */
  providerId: string;
  setOpen: (open: boolean) => void;
  openProvider: (id: string) => void;
  openCommands: () => void;
  openFiles: () => void;
  openShortcuts: () => void;
}

export const useCommandPaletteUi = create<CommandPaletteState>((set) => ({
  open: false,
  providerId: "commands",
  setOpen: (open) => set({ open }),
  openProvider: (providerId) => set({ open: true, providerId }),
  openCommands: () => set({ open: true, providerId: "commands" }),
  openFiles: () => set({ open: true, providerId: "files" }),
  openShortcuts: () => set({ open: true, providerId: "shortcuts" }),
}));
