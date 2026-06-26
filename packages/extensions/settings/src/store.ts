import { create } from "zustand";

/** Whether the settings modal is open. Local to this extension. */
interface SettingsUiState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useSettingsUi = create<SettingsUiState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
