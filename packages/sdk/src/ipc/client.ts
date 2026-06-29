import type {
  ClipboardClient,
  DragClient,
  FsClient,
  GitClient,
  KeybindingsClient,
  McpClient,
  SearchClient,
  SettingsClient,
  StorageClient,
  TerminalClient,
  UpdaterClient,
  WorkspaceClient,
} from "./clients";

/**
 * The single typed surface onto the Rust core — the security boundary.
 *
 * Trusted built-in extensions and (future) untrusted runtime add-ons both reach
 * native capability ONLY through here, never by importing @tauri-apps/api.
 */
export interface IpcClient {
  fs: FsClient;
  clipboard: ClipboardClient;
  drag: DragClient;
  git: GitClient;
  search: SearchClient;
  terminal: TerminalClient;
  workspace: WorkspaceClient;
  settings: SettingsClient;
  storage: StorageClient;
  keybindings: KeybindingsClient;
  updater: UpdaterClient;
  mcp: McpClient;
}
