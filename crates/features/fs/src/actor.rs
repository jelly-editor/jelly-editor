use std::collections::HashMap;
use std::path::{Path, PathBuf};

use ignore::WalkBuilder;
use jelly_protocol::DirEntry;
use tokio::sync::{mpsc, oneshot};

type Reply<T> = oneshot::Sender<Result<T, String>>;

/// Messages handled by the FileManager actor. Each variant carries a oneshot
/// `reply` channel that the command layer awaits.
pub enum FileManagerMsg {
    ReadFile { path: PathBuf, reply: Reply<String> },
    SaveFile { path: PathBuf, content: String, reply: Reply<()> },
    ListDir { path: PathBuf, reply: Reply<Vec<DirEntry>> },
    ListFiles { path: PathBuf, reply: Reply<Vec<DirEntry>> },
    CreateFile { path: PathBuf, reply: Reply<()> },
    CreateDir { path: PathBuf, reply: Reply<()> },
    Rename { from: PathBuf, to: PathBuf, reply: Reply<()> },
    Copy { from: PathBuf, to: PathBuf, reply: Reply<()> },
    Delete { path: PathBuf, reply: Reply<()> },
}

/// Handle to the FileManager actor, cloned into Tauri's managed state and into
/// each command invocation.
#[derive(Clone)]
pub struct FileManagerHandle {
    tx: mpsc::UnboundedSender<FileManagerMsg>,
}

impl FileManagerHandle {
    pub async fn send<T>(
        &self,
        make: impl FnOnce(Reply<T>) -> FileManagerMsg,
    ) -> Result<T, String> {
        let (reply, rx) = oneshot::channel();
        self.tx
            .send(make(reply))
            .map_err(|_| "FileManager actor is gone".to_string())?;
        rx.await.map_err(|_| "FileManager dropped reply".to_string())?
    }
}

/// Spawn the FileManager actor on the tokio runtime and return its handle.
pub fn spawn() -> FileManagerHandle {
    let (tx, mut rx) = mpsc::unbounded_channel::<FileManagerMsg>();

    // Tauri's async runtime spawns without requiring an entered tokio context,
    // so this is safe to call while building managed state.
    tauri::async_runtime::spawn(async move {
        // Dirty buffers: unsaved content mirrored from the editor, kept until save.
        let mut _dirty: HashMap<PathBuf, String> = HashMap::new();

        while let Some(msg) = rx.recv().await {
            match msg {
                FileManagerMsg::ReadFile { path, reply } => {
                    let _ = reply.send(read_file(&path));
                }
                FileManagerMsg::SaveFile { path, content, reply } => {
                    let res = std::fs::write(&path, content).map_err(|e| e.to_string());
                    if res.is_ok() {
                        _dirty.remove(&path);
                    }
                    let _ = reply.send(res);
                }
                FileManagerMsg::ListDir { path, reply } => {
                    let _ = reply.send(list_dir(&path));
                }
                FileManagerMsg::ListFiles { path, reply } => {
                    let _ = reply.send(list_files(&path));
                }
                FileManagerMsg::CreateFile { path, reply } => {
                    let res = if path.exists() {
                        Err(format!("Already exists: {}", path.display()))
                    } else {
                        std::fs::write(&path, "").map_err(|e| e.to_string())
                    };
                    let _ = reply.send(res);
                }
                FileManagerMsg::CreateDir { path, reply } => {
                    let _ = reply.send(std::fs::create_dir_all(&path).map_err(|e| e.to_string()));
                }
                FileManagerMsg::Rename { from, to, reply } => {
                    let _ = reply.send(std::fs::rename(&from, &to).map_err(|e| e.to_string()));
                }
                FileManagerMsg::Copy { from, to, reply } => {
                    let _ = reply.send(copy_path(&from, &to));
                }
                FileManagerMsg::Delete { path, reply } => {
                    let res = if path.is_dir() {
                        std::fs::remove_dir_all(&path)
                    } else {
                        std::fs::remove_file(&path)
                    };
                    let _ = reply.send(res.map_err(|e| e.to_string()));
                }
            }
        }
    });

    FileManagerHandle { tx }
}

/// Recursively copy a file or directory tree from `from` to `to`.
fn copy_path(from: &Path, to: &Path) -> Result<(), String> {
    if from.is_dir() {
        std::fs::create_dir_all(to).map_err(|e| e.to_string())?;
        for entry in std::fs::read_dir(from).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            copy_path(&entry.path(), &to.join(entry.file_name()))?;
        }
        Ok(())
    } else {
        std::fs::copy(from, to).map(|_| ()).map_err(|e| e.to_string())
    }
}

fn read_file(path: &Path) -> Result<String, String> {
    match std::fs::read(path) {
        Ok(bytes) => match String::from_utf8(bytes) {
            Ok(text) => Ok(text),
            Err(_) => Err("Cannot open binary file".to_string()),
        },
        Err(e) => Err(e.to_string()),
    }
}

/// List the immediate children of `dir`. Non-gitignored entries come first
/// (sorted dirs-before-files), then gitignored entries (same order, dimmed
/// on the frontend). `.git` is always excluded.
pub fn list_dir(dir: &Path) -> Result<Vec<DirEntry>, String> {
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", dir.display()));
    }

    let collect = |git_ignore: bool| -> std::collections::HashSet<std::path::PathBuf> {
        WalkBuilder::new(dir)
            .max_depth(Some(1))
            .hidden(false)
            .git_ignore(git_ignore)
            .git_global(git_ignore)
            .git_exclude(git_ignore)
            .parents(git_ignore)
            .filter_entry(|e| e.file_name() != ".git")
            .build()
            .filter_map(Result::ok)
            .filter(|e| e.path() != dir)
            .map(|e| e.path().to_path_buf())
            .collect()
    };

    let not_ignored = collect(true);
    let all_paths = collect(false);

    let mut entries: Vec<DirEntry> = all_paths
        .into_iter()
        .filter_map(|path| {
            let name = path.file_name()?.to_string_lossy().to_string();
            let is_dir = path.is_dir();
            let ignored = !not_ignored.contains(&path);
            Some(DirEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir,
                ignored,
            })
        })
        .collect();

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

/// Directory names always skipped during a recursive listing, regardless of
/// gitignore rules — so "Go to File" never wanders into dependency or build
/// trees even in repos that don't ignore them.
const SKIP_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    "build",
    "out",
    ".next",
    ".turbo",
    ".cache",
    "coverage",
    ".venv",
    "__pycache__",
];

/// Recursively list every file under `dir` (files only, no directories),
/// gitignore-aware and skipping the dependency/build dirs in `SKIP_DIRS`.
/// Sorted by path. Powers the "Go to File" palette.
pub fn list_files(dir: &Path) -> Result<Vec<DirEntry>, String> {
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", dir.display()));
    }

    let mut entries: Vec<DirEntry> = WalkBuilder::new(dir)
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .parents(true)
        .filter_entry(|e| {
            let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
            !(is_dir && SKIP_DIRS.contains(&e.file_name().to_string_lossy().as_ref()))
        })
        .build()
        .filter_map(Result::ok)
        .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
        .filter_map(|e| {
            let path = e.path();
            let name = path.file_name()?.to_string_lossy().to_string();
            Some(DirEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: false,
                ignored: false,
            })
        })
        .collect();

    entries.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    Ok(entries)
}
