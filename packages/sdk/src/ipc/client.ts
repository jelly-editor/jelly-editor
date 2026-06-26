import type { FsClient, GitClient, TerminalClient, WorkspaceClient } from "./clients";

/**
 * The single typed surface onto the Rust core — the security boundary.
 *
 * Trusted built-in extensions and (future) untrusted runtime add-ons both reach
 * native capability ONLY through here, never by importing @tauri-apps/api.
 */
export interface IpcClient {
  fs: FsClient;
  git: GitClient;
  terminal: TerminalClient;
  workspace: WorkspaceClient;
}
