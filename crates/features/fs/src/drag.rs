//! Transient drag session, shared across windows. The source window records the
//! dragged paths and copy intent here at drag start; the window that receives
//! the OS drop reads it to learn whether to copy or move (the native drop event
//! carries paths but no modifier).

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DragData {
    pub paths: Vec<String>,
    /// Option held at drag start (copies within the source window).
    pub alt: bool,
    /// Command held at drag start (moves across windows).
    pub cmd: bool,
    /// Label of the window that started the drag, to tell same- from cross-window.
    pub source: String,
}

#[derive(Default)]
pub struct DragSession(Mutex<Option<DragData>>);

#[tauri::command]
pub fn drag_session_write(paths: Vec<String>, alt: bool, cmd: bool, source: String, session: State<DragSession>) {
    *session.0.lock().unwrap() = Some(DragData { paths, alt, cmd, source });
}

#[tauri::command]
pub fn drag_session_read(session: State<DragSession>) -> Option<DragData> {
    session.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn drag_session_clear(session: State<DragSession>) {
    *session.0.lock().unwrap() = None;
}
