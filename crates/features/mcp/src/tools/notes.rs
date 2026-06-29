use std::path::Path;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};

use super::{ToolInfo, ToolOutput};

const NOTES_PREFIX: &str = "jelly.notes:notes:";
const TOOL_NAMES: &[&str] = &[
    "list_notes",
    "get_note",
    "create_note",
    "update_note",
    "delete_note",
];

#[derive(Clone, Debug)]
struct IndexedNote {
    id: String,
    path: String,
    folder: String,
    value: Value,
}

pub fn infos() -> Vec<ToolInfo> {
    vec![
        ToolInfo {
            name: "list_notes",
            label: "List notes",
            description: "List notes for a cwd",
            group: "Notes",
        },
        ToolInfo {
            name: "get_note",
            label: "Get note",
            description: "Read note content by file path",
            group: "Notes",
        },
        ToolInfo {
            name: "create_note",
            label: "Create note",
            description: "Create a new note for a cwd",
            group: "Notes",
        },
        ToolInfo {
            name: "update_note",
            label: "Update note",
            description: "Update note content or title",
            group: "Notes",
        },
        ToolInfo {
            name: "delete_note",
            label: "Delete note",
            description: "Permanently delete a note",
            group: "Notes",
        },
    ]
}

pub fn definitions() -> Vec<Value> {
    vec![
        json!({
            "name": "list_notes",
            "description": "List notes for a folder. Pass cwd as the absolute folder path. Returns id, alias, path, createdAt, and cwd for each note.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "cwd": { "type": "string", "description": "Absolute folder path to list notes for." }
                },
                "required": ["cwd"],
                "additionalProperties": false
            }
        }),
        json!({
            "name": "get_note",
            "description": "Read the markdown content of an indexed note by its file path.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Absolute file path of the note (from list_notes)" }
                },
                "required": ["path"],
                "additionalProperties": false
            }
        }),
        json!({
            "name": "create_note",
            "description": "Create a new markdown note for a folder. Pass cwd as the absolute folder path.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "cwd": { "type": "string", "description": "Absolute folder path to create the note for." },
                    "title": { "type": "string", "description": "Note title; defaults to today's date" },
                    "content": { "type": "string", "description": "Optional markdown body. Defaults to an empty note with the title heading." }
                },
                "required": ["cwd"],
                "additionalProperties": false
            }
        }),
        json!({
            "name": "update_note",
            "description": "Update an indexed note's content and/or title (alias).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "path": { "type": "string", "description": "Absolute file path of the note" },
                    "content": { "type": "string", "description": "New markdown content (omit to keep unchanged)" },
                    "alias": { "type": "string", "description": "New title (omit to keep unchanged)" }
                },
                "required": ["id", "path"],
                "additionalProperties": false
            }
        }),
        json!({
            "name": "delete_note",
            "description": "Permanently delete an indexed note file and remove it from the index.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "path": { "type": "string", "description": "Absolute file path of the note" }
                },
                "required": ["id", "path"],
                "additionalProperties": false
            }
        }),
    ]
}

pub fn has_tool(name: &str) -> bool {
    TOOL_NAMES.contains(&name)
}

pub async fn call(name: &str, args: Value, app: &AppHandle) -> ToolOutput {
    match name {
        "list_notes" => list_notes(args, app),
        "get_note" => get_note(args, app).await,
        "create_note" => create_note(args, app),
        "update_note" => update_note(args, app).await,
        "delete_note" => delete_note(args, app),
        _ => ToolOutput::error(format!("Unknown notes tool: {name}")),
    }
}

fn list_notes(args: Value, app: &AppHandle) -> ToolOutput {
    let cwd = match cwd_arg(&args) {
        Ok(cwd) => cwd,
        Err(err) => return ToolOutput::error(err),
    };
    let all: Vec<Value> = indexed_notes(app)
        .into_iter()
        .filter(|note| note.folder == cwd)
        .map(|note| {
            let mut value = note.value;
            if let Some(obj) = value.as_object_mut() {
                obj.insert("cwd".to_string(), Value::String(note.folder));
            }
            value
        })
        .collect();

    ToolOutput::ok(pretty_json(&all))
}

async fn get_note(args: Value, app: &AppHandle) -> ToolOutput {
    let path = match string_arg(&args, "path") {
        Ok(path) => path,
        Err(err) => return ToolOutput::error(err),
    };

    if find_note_by_path(app, &path).is_none() {
        return ToolOutput::error("Note path is not indexed by Jelly");
    }

    match tokio::fs::read_to_string(&path).await {
        Ok(content) => ToolOutput::ok(content),
        Err(e) => ToolOutput::error(format!("Error reading note: {e}")),
    }
}

fn create_note(args: Value, app: &AppHandle) -> ToolOutput {
    let cwd = match cwd_arg(&args) {
        Ok(cwd) => cwd,
        Err(err) => return ToolOutput::error(err),
    };

    let folder_path = Path::new(&cwd);
    if !folder_path.is_absolute() {
        return ToolOutput::error("cwd must be an absolute folder path");
    }
    if !folder_path.is_dir() {
        return ToolOutput::error("cwd must point to an existing directory");
    }

    let title = args
        .get("title")
        .and_then(|t| t.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .unwrap_or_else(default_title);
    let content = args
        .get("content")
        .and_then(|c| c.as_str())
        .map(str::to_string)
        .unwrap_or_else(|| format!("# {title}\n\n"));

    let id = note_id();
    let jelly_dir = jelly_core::persist::jelly_dir();
    let notes_dir = jelly_dir.join("notes").join(slugify_folder(&cwd));

    if let Err(e) = std::fs::create_dir_all(&notes_dir) {
        return ToolOutput::error(format!("Error creating notes directory: {e}"));
    }

    let file_path = notes_dir.join(format!("{id}.md"));
    if let Err(e) = std::fs::write(&file_path, &content) {
        return ToolOutput::error(format!("Error writing note file: {e}"));
    }

    let file_path_str = file_path.to_string_lossy().to_string();
    let note = json!({
        "id": id,
        "alias": title,
        "path": file_path_str,
        "createdAt": unix_millis()
    });

    let state = app.state::<jelly_core::AppState>();
    {
        let mut inner = state.inner.lock().unwrap();
        let key = format!("{NOTES_PREFIX}{cwd}");
        let mut notes = inner
            .get(&key)
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        notes.insert(0, note.clone());
        inner.insert(key, Value::Array(notes));
    }
    state.save();
    emit_notes_changed(app, &cwd, &[file_path_str.clone()]);
    emit_file_changed(app, &file_path_str);

    ToolOutput::ok(pretty_json(&json!({ "note": note, "cwd": cwd })))
}

async fn update_note(args: Value, app: &AppHandle) -> ToolOutput {
    let id = match string_arg(&args, "id") {
        Ok(id) => id,
        Err(err) => return ToolOutput::error(err),
    };
    let path = match string_arg(&args, "path") {
        Ok(path) => path,
        Err(err) => return ToolOutput::error(err),
    };
    let Some(indexed) = find_note_by_id_and_path(app, &id, &path) else {
        return ToolOutput::error("Note id/path pair is not indexed by Jelly");
    };

    let mut content_changed = false;
    if let Some(content) = args.get("content").and_then(|v| v.as_str()) {
        if let Err(e) = tokio::fs::write(&path, content).await {
            return ToolOutput::error(format!("Error writing note: {e}"));
        }
        content_changed = true;
    }

    if let Some(alias) = args.get("alias").and_then(|v| v.as_str()) {
        let alias = alias.trim();
        if alias.is_empty() {
            return ToolOutput::error("alias cannot be empty");
        }
        let state = app.state::<jelly_core::AppState>();
        let mut inner = state.inner.lock().unwrap();
        let key = format!("{NOTES_PREFIX}{}", indexed.folder);
        if let Some(notes) = inner.get_mut(&key).and_then(|v| v.as_array_mut()) {
            for note in notes.iter_mut() {
                if note.get("id").and_then(|v| v.as_str()) == Some(&id)
                    && note.get("path").and_then(|v| v.as_str()) == Some(&path)
                {
                    if let Some(obj) = note.as_object_mut() {
                        obj.insert("alias".to_string(), Value::String(alias.to_string()));
                    }
                }
            }
        }
        drop(inner);
        state.save();
    }

    let changed_paths = [path.clone()];
    emit_notes_changed(app, &indexed.folder, &changed_paths);
    if content_changed {
        emit_file_changed(app, &path);
    }
    ToolOutput::ok(pretty_json(&json!({
        "updated": true,
        "id": id,
        "path": path,
        "cwd": indexed.folder,
    })))
}

fn delete_note(args: Value, app: &AppHandle) -> ToolOutput {
    let id = match string_arg(&args, "id") {
        Ok(id) => id,
        Err(err) => return ToolOutput::error(err),
    };
    let path = match string_arg(&args, "path") {
        Ok(path) => path,
        Err(err) => return ToolOutput::error(err),
    };
    let Some(indexed) = find_note_by_id_and_path(app, &id, &path) else {
        return ToolOutput::error("Note id/path pair is not indexed by Jelly");
    };

    if let Err(e) = std::fs::remove_file(&path) {
        if e.kind() != std::io::ErrorKind::NotFound {
            return ToolOutput::error(format!("Error deleting note file: {e}"));
        }
    }

    let state = app.state::<jelly_core::AppState>();
    {
        let mut inner = state.inner.lock().unwrap();
        let key = format!("{NOTES_PREFIX}{}", indexed.folder);
        if let Some(notes) = inner.get_mut(&key).and_then(|v| v.as_array_mut()) {
            notes.retain(|note| {
                note.get("id").and_then(|v| v.as_str()) != Some(&id)
                    || note.get("path").and_then(|v| v.as_str()) != Some(&path)
            });
        }
    }
    state.save();
    let changed_paths = [path.clone()];
    emit_notes_changed(app, &indexed.folder, &changed_paths);
    emit_file_changed(app, &path);

    ToolOutput::ok(pretty_json(&json!({
        "deleted": true,
        "id": id,
        "path": path,
        "cwd": indexed.folder,
    })))
}

fn indexed_notes(app: &AppHandle) -> Vec<IndexedNote> {
    let state = app.state::<jelly_core::AppState>();
    let inner = state.inner.lock().unwrap();
    let mut all = Vec::new();

    for (key, value) in inner.iter() {
        let Some(folder) = key.strip_prefix(NOTES_PREFIX) else {
            continue;
        };
        let Some(notes) = value.as_array() else {
            continue;
        };
        for note in notes {
            let Some(id) = note.get("id").and_then(|v| v.as_str()) else {
                continue;
            };
            let Some(path) = note.get("path").and_then(|v| v.as_str()) else {
                continue;
            };
            all.push(IndexedNote {
                id: id.to_string(),
                path: path.to_string(),
                folder: folder.to_string(),
                value: note.clone(),
            });
        }
    }

    all
}

fn find_note_by_path(app: &AppHandle, path: &str) -> Option<IndexedNote> {
    indexed_notes(app)
        .into_iter()
        .find(|note| note.path == path)
}

fn find_note_by_id_and_path(app: &AppHandle, id: &str, path: &str) -> Option<IndexedNote> {
    indexed_notes(app)
        .into_iter()
        .find(|note| note.id == id && note.path == path)
}

fn string_arg(args: &Value, name: &str) -> Result<String, String> {
    args.get(name)
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .ok_or_else(|| format!("Missing required argument: {name}"))
}

fn cwd_arg(args: &Value) -> Result<String, String> {
    args.get("cwd")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .ok_or_else(|| "Missing required argument: cwd".to_string())
}

fn emit_notes_changed(app: &AppHandle, folder: &str, paths: &[String]) {
    let _ = app.emit("notes:changed", json!({ "folder": folder, "paths": paths }));
}

fn emit_file_changed(app: &AppHandle, path: &str) {
    let _ = app.emit("file:changed_externally", json!({ "path": path }));
}

fn pretty_json(value: &impl serde::Serialize) -> String {
    serde_json::to_string_pretty(value).unwrap_or_else(|_| "{}".to_string())
}

fn slugify_folder(path: &str) -> String {
    path.trim_start_matches('/').replace('/', "_")
}

fn note_id() -> String {
    let millis = unix_millis();
    let (y, mo, d) = unix_to_ymd(millis / 1000);
    let secs = millis / 1000;
    let h = (secs / 3600) % 24;
    let m = (secs / 60) % 60;
    let s = secs % 60;
    let ms = millis % 1000;
    format!("{y:04}-{mo:02}-{d:02}-{h:02}-{m:02}-{s:02}-{ms:03}")
}

fn default_title() -> String {
    let secs = unix_millis() / 1000;
    let (y, mo, d) = unix_to_ymd(secs);
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let month = months
        .get(mo.saturating_sub(1) as usize)
        .copied()
        .unwrap_or("Jan");
    format!("{month} {d}, {y}")
}

fn unix_millis() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn unix_to_ymd(secs: u64) -> (u64, u64, u64) {
    let z = (secs / 86400) as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe as i64 + era * 400 + if m <= 2 { 1 } else { 0 };
    (y as u64, m, d)
}

#[cfg(test)]
mod tests {
    use super::{definitions, slugify_folder, unix_to_ymd};

    #[test]
    fn slugify_folder_matches_notes_extension() {
        assert_eq!(
            slugify_folder("/Users/example/project"),
            "Users_example_project"
        );
    }

    #[test]
    fn unix_epoch_date_conversion_is_stable() {
        assert_eq!(unix_to_ymd(0), (1970, 1, 1));
        assert_eq!(unix_to_ymd(1_704_067_200), (2024, 1, 1));
    }

    #[test]
    fn definitions_cover_registered_tool_names() {
        let definitions = definitions();
        for name in super::TOOL_NAMES {
            assert!(definitions
                .iter()
                .any(|tool| tool.get("name").and_then(|v| v.as_str()) == Some(*name)));
        }
    }
}
