//! Process-wide file clipboard. Lives in the Rust host so a copy/cut in one
//! window is readable by every other window — they share this managed state.

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Clone, Serialize, Deserialize)]
pub struct Clip {
    pub paths: Vec<String>,
    /// `true` for a cut (move on paste), `false` for a copy.
    pub cut: bool,
}

#[derive(Default)]
pub struct FileClipboard(Mutex<Option<Clip>>);

#[tauri::command]
pub fn clipboard_write(paths: Vec<String>, cut: bool, clip: State<FileClipboard>) {
    *clip.0.lock().unwrap() = Some(Clip { paths, cut });
}

#[tauri::command]
pub fn clipboard_read(clip: State<FileClipboard>) -> Option<Clip> {
    clip.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn clipboard_clear(clip: State<FileClipboard>) {
    *clip.0.lock().unwrap() = None;
}
