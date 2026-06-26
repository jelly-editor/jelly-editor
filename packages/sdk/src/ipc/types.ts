/**
 * Payload shapes carried over the IPC surface. These mirror the Rust core's
 * serde types (see jelly-protocol in Phase 4) and are the source of truth that
 * @jelly/ipc and the feature stores both consume.
 */

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  /** populated lazily as directories are expanded */
  children?: DirEntry[];
}

export type FileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked";

export interface GitFile {
  /** repo-relative path */
  path: string;
  status: FileStatus;
}

export interface GitStatus {
  branch: string;
  staged: GitFile[];
  modified: GitFile[];
  untracked: GitFile[];
  isRepo: boolean;
}

export interface GitDiffResult {
  original: string;
  modified: string;
}
