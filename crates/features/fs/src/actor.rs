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
    CreateFile { path: PathBuf, reply: Reply<()> },
    CreateDir { path: PathBuf, reply: Reply<()> },
    Rename { from: PathBuf, to: PathBuf, reply: Reply<()> },
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

fn read_file(path: &Path) -> Result<String, String> {
    match std::fs::read(path) {
        Ok(bytes) => match String::from_utf8(bytes) {
            Ok(text) => Ok(text),
            Err(_) => Err("Cannot open binary file".to_string()),
        },
        Err(e) => Err(e.to_string()),
    }
}

/// List the immediate children of `dir`, gitignore-aware. Hidden files (e.g.
/// `.gitignore`) are shown, but `.git` and ignored paths are skipped.
/// Directories are sorted first, then files, both alphabetically.
pub fn list_dir(dir: &Path) -> Result<Vec<DirEntry>, String> {
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", dir.display()));
    }

    let mut entries: Vec<DirEntry> = WalkBuilder::new(dir)
        .max_depth(Some(1))
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .parents(true)
        .filter_entry(|e| e.file_name() != ".git")
        .build()
        .filter_map(Result::ok)
        // Skip the root dir itself, which the walker yields first.
        .filter(|e| e.path() != dir)
        .filter_map(|e| {
            let path = e.path();
            let name = path.file_name()?.to_string_lossy().to_string();
            let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
            Some(DirEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir,
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
