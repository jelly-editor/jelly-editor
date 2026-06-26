import type { DirEntry, GitDiffResult, GitStatus } from "./types";

export interface FsClient {
  read(path: string): Promise<string>;
  save(path: string, content: string): Promise<void>;
  list(path: string): Promise<DirEntry[]>;
  create(path: string): Promise<void>;
  createDir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
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

export interface WorkspaceClient {
  /** open a folder as the workspace; returns its top-level entries */
  open(path: string): Promise<DirEntry[]>;
  recent(): Promise<string[]>;
  removeRecent(path: string): Promise<void>;
}
