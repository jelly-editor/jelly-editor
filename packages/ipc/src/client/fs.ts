import { invoke } from "@tauri-apps/api/core";
import type { DirEntry, FsClient } from "@jelly/sdk";

export const fs: FsClient = {
  read: (path) => invoke<string>("read_file", { path }),
  save: (path, content) => invoke<void>("save_file", { path, content }),
  list: (path) => invoke<DirEntry[]>("list_dir", { path }),
  create: (path) => invoke<void>("create_file", { path }),
  createDir: (path) => invoke<void>("create_dir", { path }),
  rename: (from, to) => invoke<void>("rename", { from, to }),
  delete: (path) => invoke<void>("delete", { path }),
};
