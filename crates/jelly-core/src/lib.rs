//! Core host crate: workspace + window commands, recents + settings stores.
//! `register` loads both from ~/.jelly and attaches them as managed state.

pub mod cli;
pub mod keybindings;
pub mod persist;
mod recents;
pub mod settings;
pub mod state;
pub mod window;
pub mod workspace;

use tauri::{Builder, Wry};

pub use keybindings::Keybindings;
pub use recents::Recents;
pub use settings::Settings;
pub use state::AppState;
pub use window::InitialPaths;

/// Load persisted state from ~/.jelly and attach as managed state.
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder
        .manage(Recents::load())
        .manage(Settings::load())
        .manage(Keybindings::load())
        .manage(AppState::load())
        .manage(InitialPaths(std::sync::Mutex::new(std::collections::HashMap::new())))
}
