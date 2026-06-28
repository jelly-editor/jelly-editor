import { invoke } from "@tauri-apps/api/core";
import type { ClipboardClient, ClipboardEntry } from "@jelly/sdk";

export const clipboard: ClipboardClient = {
  write: (paths, cut) => invoke<void>("clipboard_write", { paths, cut }),
  read: () => invoke<ClipboardEntry | null>("clipboard_read"),
  clear: () => invoke<void>("clipboard_clear"),
};
