use tauri::{AppHandle, State};

use crate::manager::TerminalManager;

#[tauri::command]
pub fn create_terminal(
    id: String,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
    terminals: State<TerminalManager>,
    app: AppHandle,
) -> Result<(), String> {
    terminals.create(app, id, cwd, cols, rows)
}

#[tauri::command]
pub fn terminal_input(id: String, data: String, terminals: State<TerminalManager>) -> Result<(), String> {
    terminals.input(&id, &data)
}

#[tauri::command]
pub fn terminal_resize(
    id: String,
    cols: u16,
    rows: u16,
    terminals: State<TerminalManager>,
) -> Result<(), String> {
    terminals.resize(&id, cols, rows)
}

#[tauri::command]
pub fn close_terminal(id: String, terminals: State<TerminalManager>) {
    terminals.close(&id);
}
