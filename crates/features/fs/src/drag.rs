//! Transient drag session, shared across windows. The source window records the
//! dragged paths and copy intent here at drag start; the window that receives
//! the OS drop reads it to learn whether to copy or move (the native drop event
//! carries paths but no modifier).

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Clone, Serialize, Deserialize)]
pub struct DragData {
    pub paths: Vec<String>,
    pub copy: bool,
}

#[derive(Default)]
pub struct DragSession(Mutex<Option<DragData>>);

#[tauri::command]
pub fn drag_session_write(paths: Vec<String>, copy: bool, session: State<DragSession>) {
    *session.0.lock().unwrap() = Some(DragData { paths, copy });
}

#[tauri::command]
pub fn drag_session_read(session: State<DragSession>) -> Option<DragData> {
    session.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn drag_session_clear(session: State<DragSession>) {
    *session.0.lock().unwrap() = None;
}
