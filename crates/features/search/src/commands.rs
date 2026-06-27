use tauri::{AppHandle, State};

use crate::manager::{SearchManager, SearchParams};

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
