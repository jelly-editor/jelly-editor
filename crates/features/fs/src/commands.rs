use std::path::PathBuf;

use jelly_protocol::DirEntry;
use tauri::{AppHandle, Emitter, State};

use crate::actor::{FileManagerHandle, FileManagerMsg};

#[tauri::command]
pub async fn read_file(path: String, files: State<'_, FileManagerHandle>) -> Result<String, String> {
    let path = PathBuf::from(path);
    files.send(|reply| FileManagerMsg::ReadFile { path, reply }).await
}

#[tauri::command]
pub async fn save_file(
    path: String,
    content: String,
    files: State<'_, FileManagerHandle>,
    app: AppHandle,
) -> Result<(), String> {
    let pb = PathBuf::from(&path);
    files
        .send(|reply| FileManagerMsg::SaveFile { path: pb, content, reply })
        .await?;
    let _ = app.emit("file:saved", path);
    Ok(())
}

#[tauri::command]
pub async fn list_dir(path: String, files: State<'_, FileManagerHandle>) -> Result<Vec<DirEntry>, String> {
    let path = PathBuf::from(path);
    files.send(|reply| FileManagerMsg::ListDir { path, reply }).await
}

#[tauri::command]
pub async fn list_files(path: String, files: State<'_, FileManagerHandle>) -> Result<Vec<DirEntry>, String> {
    let path = PathBuf::from(path);
    files.send(|reply| FileManagerMsg::ListFiles { path, reply }).await
}

#[tauri::command]
pub async fn create_file(path: String, files: State<'_, FileManagerHandle>) -> Result<(), String> {
    let path = PathBuf::from(path);
    files.send(|reply| FileManagerMsg::CreateFile { path, reply }).await
}

#[tauri::command]
pub async fn create_dir(path: String, files: State<'_, FileManagerHandle>) -> Result<(), String> {
    let path = PathBuf::from(path);
    files.send(|reply| FileManagerMsg::CreateDir { path, reply }).await
}

#[tauri::command]
pub async fn rename(from: String, to: String, files: State<'_, FileManagerHandle>) -> Result<(), String> {
    let from = PathBuf::from(from);
    let to = PathBuf::from(to);
    files.send(|reply| FileManagerMsg::Rename { from, to, reply }).await
}

#[tauri::command]
pub async fn copy(from: String, to: String, files: State<'_, FileManagerHandle>) -> Result<(), String> {
    let from = PathBuf::from(from);
    let to = PathBuf::from(to);
    files.send(|reply| FileManagerMsg::Copy { from, to, reply }).await
}

#[tauri::command]
pub async fn delete(path: String, files: State<'_, FileManagerHandle>) -> Result<(), String> {
    let path = PathBuf::from(path);
    files.send(|reply| FileManagerMsg::Delete { path, reply }).await
}
