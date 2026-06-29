use std::path::PathBuf;

use jelly_fs::list_dir;
use jelly_protocol::DirEntry;
use jelly_watcher::FileWatcher;
use tauri::{AppHandle, State};

use crate::recents::Recents;

const MAX_RECENTS: usize = 5;

/// Open a folder as the workspace: list its top level, start watching it for
/// external changes (replacing any prior watch), and record it in recents.
#[tauri::command]
pub fn open_workspace(
    path: String,
    watcher: State<FileWatcher>,
    recents: State<Recents>,
    app: AppHandle,
) -> Result<Vec<DirEntry>, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }

    let tree = list_dir(&root)?;
    watcher.watch(app, root)?;

    {
        let mut inner = recents.inner.lock().unwrap();
        inner.retain(|p| p != &path);
        inner.insert(0, path);
        inner.truncate(MAX_RECENTS);
    }
    recents.save();

    Ok(tree)
}

#[tauri::command]
pub fn get_recent_folders(recents: State<Recents>) -> Vec<String> {
    recents.inner.lock().unwrap().clone()
}

#[tauri::command]
pub fn remove_recent_folder(path: String, recents: State<Recents>) {
    recents.inner.lock().unwrap().retain(|p| p != &path);
    recents.save();
}
