/**
 * Payload shapes carried over the IPC surface. These mirror the Rust core's
 * serde types (see jelly-protocol in Phase 4) and are the source of truth that
 * @jelly/ipc and the feature stores both consume.
 */

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  ignored: boolean;
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

export interface GitStash {
  index: number;
  message: string;
}

export interface SearchOptions {
  /** absolute workspace root to search under */
  workspace: string;
  query: string;
  caseSensitive: boolean;
  regex: boolean;
}

/** One matched line within a file. */
export interface SearchMatch {
  /** 1-based line number */
  line: number;
  /** the full matched line (trailing newline stripped) */
  text: string;
  /** character offset ranges [start, end) of each match within `text` */
  ranges: [number, number][];
}

/** A `search:result` event payload — one file's matches. */
export interface SearchFileResult {
  searchId: number;
  /** absolute path, for opening the file */
  path: string;
  /** workspace-relative path, for display */
  relPath: string;
  matches: SearchMatch[];
}

/** A `search:done` event payload. */
export interface SearchDone {
  searchId: number;
  /** true if results were truncated because the cap was hit */
  capped: boolean;
}

export interface ReplaceOptions {
  /** absolute path of the file to edit */
  path: string;
  query: string;
  replacement: string;
  caseSensitive: boolean;
  /** when true, `replacement` may reference capture groups ($1, ${name}) */
  regex: boolean;
  /**
   * 1-based line numbers to restrict the replacement to (e.g. a single result
   * row). `null` replaces every match in the file.
   */
  lines: number[] | null;
}
