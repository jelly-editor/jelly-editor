import type { DirEntry, GitDiffResult, GitStatus, ReplaceOptions, SearchOptions } from "./types";

export interface FsClient {
  read(path: string): Promise<string>;
  save(path: string, content: string): Promise<void>;
  list(path: string): Promise<DirEntry[]>;
  create(path: string): Promise<void>;
  createDir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  delete(path: string): Promise<void>;
}

export interface GitClient {
  status(workspace: string): Promise<GitStatus>;
  diff(workspace: string, path: string): Promise<GitDiffResult>;
  stage(workspace: string, path: string): Promise<void>;
  unstage(workspace: string, path: string): Promise<void>;
  commit(workspace: string, message: string): Promise<void>;
}

export interface TerminalClient {
  /** caller supplies the id; the PTY is created with the given initial size */
  create(id: string, cwd: string | null, cols: number, rows: number): Promise<void>;
  input(id: string, data: string): Promise<void>;
  resize(id: string, cols: number, rows: number): Promise<void>;
  close(id: string): Promise<void>;
}

export interface SearchClient {
  /**
   * Begin a streaming workspace search. Matches arrive as `search:result`
   * events tagged with `searchId`; `search:done` fires when the walk ends.
   * Rejects if the regex is invalid. The caller supplies `searchId` so it can
   * ignore events from a superseded search.
   */
  start(searchId: number, opts: SearchOptions): Promise<void>;
  /** Cancel the in-flight search (if any). */
  cancel(): Promise<void>;
  /** Replace matches in one file; resolves with the number of replacements. */
  replace(opts: ReplaceOptions): Promise<number>;
}

export interface WorkspaceClient {
  /** open a folder as the workspace; returns its top-level entries */
  open(path: string): Promise<DirEntry[]>;
  recent(): Promise<string[]>;
  removeRecent(path: string): Promise<void>;
}

export interface SettingsClient {
  load(): Promise<Record<string, unknown>>;
  save(key: string, value: unknown): Promise<void>;
}

export interface KeybindingsClient {
  /** the saved user overrides: command id → key spec (`""` = unbound) */
  load(): Promise<Record<string, string>>;
  /** persist the full override map, replacing whatever was on disk */
  save(overrides: Record<string, string>): Promise<void>;
}
