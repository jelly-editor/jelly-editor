import type { DirEntry, GitDiffResult, GitStash, GitStatus, ReplaceOptions, SearchOptions } from "./types";

export interface FsClient {
  read(path: string): Promise<string>;
  save(path: string, content: string): Promise<void>;
  list(path: string): Promise<DirEntry[]>;
  /** Recursively list every file under `path` (files only), gitignore-aware
   *  and skipping dependency/build dirs. Powers "Go to File". */
  listFiles(path: string): Promise<DirEntry[]>;
  create(path: string): Promise<void>;
  createDir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  delete(path: string): Promise<void>;
  /** Broadcast that `path` changed, so every window re-lists its parent dir. */
  notifyChanged(path: string): Promise<void>;
  /** Reveal `path` in the OS file manager (Finder / Explorer), selecting it. */
  reveal(path: string): Promise<void>;
}

/** A pending file clipboard entry, shared across all windows by the host. */
export interface ClipboardEntry {
  paths: string[];
  /** `true` for a cut (move on paste), `false` for a copy. */
  cut: boolean;
}

export interface ClipboardClient {
  /** Stage `paths` for a copy (or cut) — overwrites any previous entry. */
  write(paths: string[], cut: boolean): Promise<void>;
  /** Read the current entry, or `null` when the clipboard is empty. */
  read(): Promise<ClipboardEntry | null>;
  clear(): Promise<void>;
}

export interface DragSession {
  paths: string[];
  /** Option held at drag start. Copies within the source window. */
  alt: boolean;
  /** Command held at drag start. Moves across windows. */
  cmd: boolean;
  /** Window label that started the drag. */
  source: string;
}

export type DragDropPhase = "enter" | "over" | "drop" | "leave";

export interface DragDropEvent {
  phase: DragDropPhase;
  /** Dropped file paths — present on `enter`/`drop`, empty otherwise. */
  paths: string[];
  /** Cursor position in CSS pixels relative to the webview. */
  x: number;
  y: number;
}

/** Cross-window file drag, backed by an OS-native drag operation. */
export interface DragClient {
  /** Begin an OS drag carrying `paths`. `alt`/`cmd` are the modifiers held at
   *  drag start; the drop window derives copy-vs-move from them and whether the
   *  drag is same- or cross-window. `icon` is an optional PNG data-URI image. */
  start(paths: string[], alt: boolean, cmd: boolean, icon?: string): Promise<void>;
  /** Update the active Jelly drag session's current modifier state, if any. */
  updateModifiers(alt: boolean, cmd: boolean): Promise<void>;
  /** The current session, recorded by the source window (null if none). */
  readSession(): Promise<DragSession | null>;
  clearSession(): Promise<void>;
  /** Subscribe to native drag-drop events on this window; returns an unsubscribe. */
  onDrop(handler: (e: DragDropEvent) => void): Promise<() => void>;
}

export interface GitClient {
  status(workspace: string): Promise<GitStatus>;
  diff(workspace: string, path: string): Promise<GitDiffResult>;
  stage(workspace: string, path: string): Promise<void>;
  unstage(workspace: string, path: string): Promise<void>;
  /** Discard working-tree changes: restore tracked files to HEAD, delete untracked. */
  discard(workspace: string, path: string): Promise<void>;
  commit(workspace: string, message: string): Promise<void>;
  stash(workspace: string, message?: string): Promise<void>;
  stashList(workspace: string): Promise<GitStash[]>;
  stashApply(workspace: string, index: number): Promise<void>;
  stashDrop(workspace: string, index: number): Promise<void>;
  push(workspace: string): Promise<void>;
  pull(workspace: string): Promise<void>;
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

export interface StorageClient {
  /** the full persisted state map (kernel-namespaced keys) */
  load(): Promise<Record<string, unknown>>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface KeybindingsClient {
  /** the saved user overrides: command id → key spec (`""` = unbound) */
  load(): Promise<Record<string, string>>;
  /** persist the full override map, replacing whatever was on disk */
  save(overrides: Record<string, string>): Promise<void>;
}

export interface UpdateCheckResult {
  currentVersion: string;
  available: boolean;
  version?: string;
  date?: string;
  body?: string;
}

export interface UpdaterClient {
  /** Check the configured release endpoint for a newer signed build. */
  check(): Promise<UpdateCheckResult>;
  /** Download, install, and relaunch into the latest available build. */
  installAndRestart(): Promise<void>;
}

export interface McpStatus {
  running: boolean;
  port: number | null;
  error?: string | null;
}

export interface McpToolInfo {
  name: string;
  label: string;
  description: string;
  group: string;
}

export interface McpClient {
  start(port: number, allowedTools: string[]): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<McpStatus>;
  tools(): Promise<McpToolInfo[]>;
  updateTools(tools: string[]): Promise<void>;
}
