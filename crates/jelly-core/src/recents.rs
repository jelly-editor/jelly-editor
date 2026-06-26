use std::sync::Mutex;

/// Recently-opened workspace folders (most-recent first). Managed state.
#[derive(Default)]
pub struct Recents {
    pub inner: Mutex<Vec<String>>,
}

impl Recents {
    pub fn load() -> Self {
        let inner = crate::persist::load_json::<Vec<String>>("recents.json").unwrap_or_default();
        Self { inner: Mutex::new(inner) }
    }

    pub fn save(&self) {
        let inner = self.inner.lock().unwrap();
        crate::persist::save_json("recents.json", &*inner);
    }
}
