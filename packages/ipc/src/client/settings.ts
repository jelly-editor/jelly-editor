import { invoke } from "@tauri-apps/api/core";
import type { SettingsClient } from "@jelly/sdk";

export const settings: SettingsClient = {
  load: () => invoke<Record<string, unknown>>("load_settings"),
  save: (key: string, value: unknown) => invoke<void>("save_setting", { key, value }),
};
