/**
 * @jelly/ipc — the single privileged channel to the Rust core.
 *
 * This is the ONLY package that imports @tauri-apps/api. It exposes the typed
 * command client (implementing the SDK IpcClient), the native event bridge, and
 * the dialog/window host utilities.
 */
export { ipc, fs, git, search, terminal, workspace, settings, keybindings } from "./client";
export { CORE_EVENT_NAMES, bridgeCoreEvents, type CoreEventMap, type CoreEventName } from "./events";
export { confirm, pickFolder } from "./dialog";
export { openEditorWindow, getInitialPath, installShellCommand } from "./window";
export type { InstallResult } from "./window";
