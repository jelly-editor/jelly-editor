/**
 * @jelly/ipc — the single privileged channel to the Rust core.
 *
 * This is the ONLY package that imports @tauri-apps/api. It exposes the typed
 * command client (implementing the SDK IpcClient), the native event bridge, and
 * the dialog/window host utilities.
 */
export { ipc, fs, git, terminal, workspace, settings } from "./client";
export { CORE_EVENT_NAMES, bridgeCoreEvents, type CoreEventMap, type CoreEventName } from "./events";
export { confirm, pickFolder } from "./dialog";
export { openEditorWindow } from "./window";
