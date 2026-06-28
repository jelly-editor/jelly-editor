import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import type { DirEntry, FsClient } from "@jelly/sdk";

export const fs: FsClient = {
  read: (path) => invoke<string>("read_file", { path }),
  save: (path, content) => invoke<void>("save_file", { path, content }),
  list: (path) => invoke<DirEntry[]>("list_dir", { path }),
  listFiles: (path) => invoke<DirEntry[]>("list_files", { path }),
  create: (path) => invoke<void>("create_file", { path }),
  createDir: (path) => invoke<void>("create_dir", { path }),
  rename: (from, to) => invoke<void>("rename", { from, to }),
  copy: (from, to) => invoke<void>("copy", { from, to }),
  delete: (path) => invoke<void>("delete", { path }),
  notifyChanged: (path) => emit("file:changed_externally", { path }),
};
