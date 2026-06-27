use std::{collections::HashMap, sync::Mutex};

use tauri::State;

/// Persisted user keybinding overrides: command id → key spec (`""` = unbound).
/// Overlaid on top of extension-declared defaults by the frontend kernel.
#[derive(Default)]
pub struct Keybindings {
    pub inner: Mutex<HashMap<String, String>>,
}

impl Keybindings {
    pub fn load() -> Self {
        let inner = crate::persist::load_json::<HashMap<String, String>>("keybindings.json")
            .unwrap_or_default();
        Self { inner: Mutex::new(inner) }
    }

    pub fn save(&self) {
        let inner = self.inner.lock().unwrap();
        crate::persist::save_json("keybindings.json", &*inner);
    }
}

#[tauri::command]
pub fn load_keybindings(state: State<Keybindings>) -> HashMap<String, String> {
    state.inner.lock().unwrap().clone()
}

#[tauri::command]
pub fn save_keybindings(overrides: HashMap<String, String>, state: State<Keybindings>) {
    *state.inner.lock().unwrap() = overrides;
    state.save();
}
