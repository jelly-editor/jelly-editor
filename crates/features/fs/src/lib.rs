//! Filesystem feature: a FileManager actor (serializes all fs work onto one
//! task) plus the Tauri commands that drive it. `register` attaches the actor
//! handle as managed state; `list_dir` is exposed for the workspace command.
//!
//! Commands live under `commands` so `generate_handler!` derives their invoke
//! names from the original idents (the pure `list_dir` fn would otherwise
//! collide with the `list_dir` command at the crate root).

mod actor;
pub mod clipboard;
pub mod commands;
pub mod drag;

use tauri::{Builder, Wry};

pub use actor::{list_dir, FileManagerHandle, FileManagerMsg};
pub use clipboard::FileClipboard;
pub use drag::DragSession;

/// Spawn the FileManager actor and attach it, plus the shared file clipboard
/// and drag session, as managed state.
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder
        .manage(actor::spawn())
        .manage(FileClipboard::default())
        .manage(DragSession::default())
}
