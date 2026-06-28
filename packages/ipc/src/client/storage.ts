import { invoke } from "@tauri-apps/api/core";
import type { StorageClient } from "@jelly/sdk";

export const storage: StorageClient = {
  load: () => invoke<Record<string, unknown>>("load_state"),
  set: (key: string, value: unknown) => invoke<void>("save_state", { key, value }),
  delete: (key: string) => invoke<void>("delete_state", { key }),
};
