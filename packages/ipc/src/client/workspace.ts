import { invoke } from "@tauri-apps/api/core";
import type { DirEntry, WorkspaceClient } from "@jelly/sdk";

export const workspace: WorkspaceClient = {
  open: (path) => invoke<DirEntry[]>("open_workspace", { path }),
  recent: () => invoke<string[]>("get_recent_folders"),
  removeRecent: (path) => invoke<void>("remove_recent_folder", { path }),
};
