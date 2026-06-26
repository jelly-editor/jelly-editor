//! Git feature: stateless Tauri commands backed by libgit2 (git2). Commands
//! live in the `commands` submodule (the `#[tauri::command]` macro's generated
//! re-export collides when commands sit at the crate root). No managed state,
//! so no `register` — the host just lists these commands.

pub mod commands;
