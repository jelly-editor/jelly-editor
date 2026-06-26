use std::{collections::HashMap, sync::Mutex};

use serde_json::Value;
use tauri::State;

/// Persisted editor settings. Managed state.
#[derive(Default)]
pub struct Settings {
    pub inner: Mutex<HashMap<String, Value>>,
}

impl Settings {
    pub fn load() -> Self {
        let inner = crate::persist::load_json::<HashMap<String, Value>>("settings.json")
            .unwrap_or_default();
        Self { inner: Mutex::new(inner) }
    }

    pub fn save(&self) {
        let inner = self.inner.lock().unwrap();
        crate::persist::save_json("settings.json", &*inner);
    }
}

#[tauri::command]
pub fn load_settings(state: State<Settings>) -> HashMap<String, Value> {
    state.inner.lock().unwrap().clone()
}

#[tauri::command]
pub fn save_setting(key: String, value: Value, state: State<Settings>) {
    state.inner.lock().unwrap().insert(key, value);
    state.save();
}
