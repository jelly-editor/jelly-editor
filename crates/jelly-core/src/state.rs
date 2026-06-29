use std::{collections::HashMap, sync::Mutex};

use serde_json::Value;
use tauri::State;

/// Persisted per-extension UI state (open tabs, expanded folders, …), saved to
/// `state.json`. Keys are namespaced by the kernel, so this is a flat map.
#[derive(Default)]
pub struct AppState {
    pub inner: Mutex<HashMap<String, Value>>,
}

impl AppState {
    pub fn load() -> Self {
        let inner =
            crate::persist::load_json::<HashMap<String, Value>>("state.json").unwrap_or_default();
        Self { inner: Mutex::new(inner) }
    }

    pub fn save(&self) {
        let inner = self.inner.lock().unwrap();
        crate::persist::save_json("state.json", &*inner);
    }
}

#[tauri::command]
pub fn load_state(state: State<AppState>) -> HashMap<String, Value> {
    state.inner.lock().unwrap().clone()
}

#[tauri::command]
pub fn save_state(key: String, value: Value, state: State<AppState>) {
    state.inner.lock().unwrap().insert(key, value);
    state.save();
}

#[tauri::command]
pub fn delete_state(key: String, state: State<AppState>) {
    state.inner.lock().unwrap().remove(&key);
    state.save();
}
