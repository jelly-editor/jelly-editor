import { invoke } from "@tauri-apps/api/core";
import type { KeybindingsClient } from "@jelly/sdk";

export const keybindings: KeybindingsClient = {
  load: () => invoke<Record<string, string>>("load_keybindings"),
  save: (overrides: Record<string, string>) =>
    invoke<void>("save_keybindings", { overrides }),
};
