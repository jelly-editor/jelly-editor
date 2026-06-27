//! Search feature: a SearchManager that walks the open workspace with ripgrep's
//! `grep`/`ignore` libraries and streams matches to the frontend as
//! `search:result` events, ending with `search:done`. Commands live in the
//! `commands` submodule so the host can reference `jelly_search::commands::*`.

pub mod commands;
mod manager;

use tauri::{Builder, Wry};

pub use manager::SearchManager;

/// Attach a fresh SearchManager as managed state.
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder.manage(SearchManager::new())
}
