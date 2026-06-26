//! Core host crate: workspace + window commands, recents + settings stores.
//! `register` loads both from ~/.jelly and attaches them as managed state.

mod persist;
mod recents;
pub mod settings;
pub mod window;
pub mod workspace;

use tauri::{Builder, Wry};

pub use recents::Recents;
pub use settings::Settings;

/// Load persisted state from ~/.jelly and attach as managed state.
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder.manage(Recents::load()).manage(Settings::load())
}
