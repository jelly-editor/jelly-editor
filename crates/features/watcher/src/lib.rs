//! Filesystem watcher feature: owns the active watch and emits
//! `file:changed_externally` (debounced) to the front end. `register` attaches
//! the watcher as managed state; the workspace command calls `watch`.
//!
//! Rather than a single recursive watch on the root, this watches each
//! non-ignored directory individually (non-recursive). Ignored trees —
//! `.gitignore` matches plus builtin heavy dirs like `node_modules` — are never
//! registered, which avoids the OS-event storm (and inotify-descriptor
//! exhaustion on Linux) that freezes the app when a workspace has no
//! `.gitignore`.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use ignore::WalkBuilder;
use jelly_protocol::FileChangedPayload;
use notify::{RecursiveMode, Watcher};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult};
use tauri::{AppHandle, Builder, Emitter, Wry};

/// Directory name segments ignored regardless of `.gitignore` — heavy
/// generated/dependency dirs that should never be watched.
const BUILTIN_IGNORE_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    ".cargo",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    ".turbo",
    ".parcel-cache",
    ".cache",
    "__pycache__",
    ".venv",
    "venv",
    ".tox",
    ".idea",
    ".vscode",
];

/// Walker over `root` that skips builtin-ignored dirs and honors `.gitignore`
/// (including parent and global ignores). Used to enumerate directories to watch.
fn walker(root: &Path) -> ignore::Walk {
    WalkBuilder::new(root)
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .parents(true)
        .filter_entry(|e| !BUILTIN_IGNORE_DIRS.contains(&e.file_name().to_string_lossy().as_ref()))
        .build()
}

/// Watch every non-ignored directory under `start` (non-recursive), recording
/// each in `watched` so it is registered at most once.
fn add_watches(watcher: &mut dyn Watcher, watched: &mut HashSet<PathBuf>, start: &Path) {
    for entry in walker(start).filter_map(Result::ok) {
        if entry.file_type().is_some_and(|t| t.is_dir()) {
            let path = entry.path().to_path_buf();
            if watched.insert(path.clone()) {
                let _ = watcher.watch(&path, RecursiveMode::NonRecursive);
            }
        }
    }
}

/// Owns the active watch by holding a stop flag for its background thread.
/// Calling `watch` again signals the previous thread to exit, which drops its
/// debouncer and releases all OS watches.
pub struct FileWatcher {
    stop: Mutex<Option<Arc<AtomicBool>>>,
}

impl Default for FileWatcher {
    fn default() -> Self {
        Self::new()
    }
}

impl FileWatcher {
    pub fn new() -> Self {
        Self {
            stop: Mutex::new(None),
        }
    }

    /// Watch `root`, replacing any previous watch. External changes are
    /// debounced (300ms) and emitted as `file:changed_externally`. Newly
    /// created directories are picked up and watched on the fly; ignored trees
    /// are never registered.
    pub fn watch(&self, app: AppHandle, root: PathBuf) -> Result<(), String> {
        let (tx, rx) = mpsc::channel();
        let mut debouncer =
            new_debouncer(Duration::from_millis(300), move |res: DebounceEventResult| {
                let _ = tx.send(res);
            })
            .map_err(|e| e.to_string())?;

        // Signal the previous watch thread (if any) to exit, and install ours.
        let stop = Arc::new(AtomicBool::new(false));
        {
            let mut guard = self.stop.lock().unwrap();
            if let Some(prev) = guard.replace(stop.clone()) {
                prev.store(true, Ordering::Relaxed);
            }
        }

        std::thread::spawn(move || {
            let mut watched = HashSet::new();
            add_watches(debouncer.watcher(), &mut watched, &root);

            // The working-tree walk skips `.git`; watch it separately so staging
            // and commits from outside the app refresh the Git panel.
            let git_dir = root.join(".git");
            if git_dir.is_dir() {
                let _ = debouncer
                    .watcher()
                    .watch(&git_dir, RecursiveMode::Recursive);
            }

            // recv_timeout polls the stop flag while idle; events still arrive
            // immediately whenever the channel has data.
            while !stop.load(Ordering::Relaxed) {
                match rx.recv_timeout(Duration::from_millis(500)) {
                    Ok(Ok(events)) => {
                        for event in events {
                            let in_git = event.path.starts_with(&git_dir);
                            if !in_git && event.path.is_dir() && !watched.contains(&event.path) {
                                add_watches(debouncer.watcher(), &mut watched, &event.path);
                            }
                            let payload = FileChangedPayload {
                                path: event.path.to_string_lossy().to_string(),
                            };
                            let topic = if in_git { "git:changed" } else { "file:changed_externally" };
                            let _ = app.emit(topic, payload);
                        }
                    }
                    Ok(Err(e)) => {
                        let _ = app.emit("watcher:error", format!("watch error: {e:?}"));
                    }
                    Err(RecvTimeoutError::Timeout) => {}
                    Err(RecvTimeoutError::Disconnected) => break,
                }
            }
        });

        Ok(())
    }
}

/// Attach a fresh FileWatcher as managed state.
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder.manage(FileWatcher::new())
}
