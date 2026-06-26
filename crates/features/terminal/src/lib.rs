//! Terminal feature: a TerminalManager owning all PTY sessions, plus the Tauri
//! commands that drive them. Commands live in the `commands` submodule so the
//! host can reference `jelly_terminal::commands::*` (the `#[tauri::command]`
//! macro's generated helper resolves adjacent to the command path).

pub mod commands;
mod manager;

use tauri::{Builder, Wry};

pub use manager::TerminalManager;

/// Attach a fresh TerminalManager as managed state.
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder.manage(TerminalManager::new())
}
