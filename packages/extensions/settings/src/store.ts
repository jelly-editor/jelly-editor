import { create } from "zustand";

import type { UpdateCheckResult } from "@jelly/sdk";

export type SettingsTab = "general" | "keybindings" | "about";
export type UpdateStatus = "idle" | "checking" | "available" | "current" | "installing" | "error";

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string | null;
  availableVersion: string | null;
  error: string | null;
  checkedAt: number | null;
}

const initialUpdate: UpdateState = {
  status: "idle",
  currentVersion: null,
  availableVersion: null,
  error: null,
  checkedAt: null,
};

/** Settings modal and update-check UI state. Local to this extension. */
interface SettingsUiState {
  open: boolean;
  tab: SettingsTab;
  update: UpdateState;
  setOpen: (open: boolean) => void;
  setTab: (tab: SettingsTab) => void;
  toggle: () => void;
  setChecking: () => void;
  setUpdateResult: (result: UpdateCheckResult) => void;
  setUpdateError: (error: unknown) => void;
  setInstalling: () => void;
  resetUpdate: () => void;
}

export const useSettingsUi = create<SettingsUiState>((set) => ({
  open: false,
  tab: "general",
  update: initialUpdate,
  setOpen: (open) => set({ open }),
  setTab: (tab) => set({ tab }),
  toggle: () => set((s) => ({ open: !s.open })),
  setChecking: () =>
    set((s) => ({
      update: { ...s.update, status: "checking", error: null },
    })),
  setUpdateResult: (result) =>
    set({
      update: {
        status: result.available ? "available" : "current",
        currentVersion: result.currentVersion,
        availableVersion: result.version ?? null,
        error: null,
        checkedAt: Date.now(),
      },
    }),
  setUpdateError: (error) =>
    set((s) => ({
      update: {
        ...s.update,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        checkedAt: Date.now(),
      },
    })),
  setInstalling: () =>
    set((s) => ({
      update: { ...s.update, status: "installing", error: null },
    })),
  resetUpdate: () => set({ update: initialUpdate }),
}));
