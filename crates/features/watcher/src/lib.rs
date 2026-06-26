//! Filesystem watcher feature: owns the active recursive watch and emits
//! `file:changed_externally` (debounced) to the front end. `register` attaches
//! the watcher as managed state; the workspace command calls `watch`.

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use jelly_protocol::FileChangedPayload;
use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode, DebounceEventResult};
use tauri::{AppHandle, Builder, Emitter, Wry};

/// Owns the active filesystem watcher. Holding the debouncer keeps the watch
/// alive; dropping it (on `watch` of a new root) tears the old one down.
pub struct FileWatcher {
    inner: Mutex<Option<Box<dyn std::any::Any + Send>>>,
}

impl Default for FileWatcher {
    fn default() -> Self {
        Self::new()
    }
}

impl FileWatcher {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    /// Watch `root` recursively, replacing any previous watch. External changes
    /// are debounced (300ms) and emitted to the frontend as
    /// `file:changed_externally`.
    pub fn watch(&self, app: AppHandle, root: PathBuf) -> Result<(), String> {
        let mut debouncer = new_debouncer(
            Duration::from_millis(300),
            move |res: DebounceEventResult| match res {
                Ok(events) => {
                    for event in events {
                        let payload = FileChangedPayload {
                            path: event.path.to_string_lossy().to_string(),
                        };
                        let _ = app.emit("file:changed_externally", payload);
                    }
                }
                Err(e) => {
                    let _ = app.emit("watcher:error", format!("watch error: {e:?}"));
                }
            },
        )
        .map_err(|e| e.to_string())?;

        debouncer
            .watcher()
            .watch(&root, RecursiveMode::Recursive)
            .map_err(|e| e.to_string())?;

        // Stash the debouncer so it stays alive for the lifetime of the watch.
        *self.inner.lock().unwrap() = Some(Box::new(debouncer));
        Ok(())
    }
}

/// Attach a fresh FileWatcher as managed state.
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder.manage(FileWatcher::new())
}
