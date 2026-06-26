//! Core host crate: workspace + window commands and the recents store that tie
//! the feature crates together. `register` attaches the recents state; the
//! workspace command coordinates `jelly-fs` (listing) and `jelly-watcher`.
//!
//! Commands stay in their submodules (`workspace`, `window`) so the host can
//! reference `jelly_core::workspace::*` — the `#[tauri::command]` macro's
//! generated helper resolves adjacent to the command path.

mod recents;
pub mod window;
pub mod workspace;

use tauri::{Builder, Wry};

pub use recents::Recents;

/// Attach the recents store as managed state.
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder.manage(Recents::default())
}
