use std::sync::Mutex;

/// Recently-opened workspace folders (most-recent first). Managed state.
#[derive(Default)]
pub struct Recents {
    pub inner: Mutex<Vec<String>>,
}
