use std::collections::HashSet;
use std::path::Path;

use tauri::{AppHandle, State};

use crate::manager::{SearchManager, SearchParams};
use crate::replace;

/// Begin a streaming workspace search. Matches arrive as `search:result` events
/// tagged with `search_id`; `search:done` fires when the walk finishes. An
/// invalid regex is reported synchronously as an `Err`.
#[tauri::command]
pub fn start_search(
    search_id: u64,
    workspace: String,
    query: String,
    case_sensitive: bool,
    is_regex: bool,
    search: State<SearchManager>,
    app: AppHandle,
) -> Result<(), String> {
    search.start(
        app,
        SearchParams {
            search_id,
            workspace,
            query,
            case_sensitive,
            is_regex,
        },
    )
}

/// Cancel the in-flight search (if any). A no-op if nothing is running.
#[tauri::command]
pub fn cancel_search(search: State<SearchManager>) {
    search.cancel();
}

/// Replace matches in a single file. When `lines` is given, only matches on
/// those 1-based lines are replaced; otherwise every match in the file is.
/// Returns the number of replacements made. The watcher picks up the write and
/// emits `file:changed_externally`, so the editor and git refresh on their own.
#[tauri::command]
pub fn replace_in_file(
    path: String,
    query: String,
    replacement: String,
    case_sensitive: bool,
    is_regex: bool,
    lines: Option<Vec<u32>>,
) -> Result<u32, String> {
    let re = replace::build_regex(&query, case_sensitive, is_regex)?;
    let set: Option<HashSet<u32>> = lines.map(|v| v.into_iter().collect());
    replace::replace_in_file(Path::new(&path), &re, &replacement, is_regex, set.as_ref())
}
