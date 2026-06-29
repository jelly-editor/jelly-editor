pub mod commands;
mod server;
mod tools;

use tauri::{Builder, Wry};

pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder.manage(commands::McpState::new())
}
