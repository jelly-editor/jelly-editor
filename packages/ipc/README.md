# @jelly/ipc

The single privileged channel to the Rust core and Tauri plugins — the only
module that imports `@tauri-apps/api` for extension-facing native capability.
Exposes the typed command client, the native event bridge, updater access, and
dialog/window helpers.
