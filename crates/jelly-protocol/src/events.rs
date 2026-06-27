use serde::Serialize;

/// Payload for the `file:changed_externally` event.
#[derive(Clone, Serialize)]
pub struct FileChangedPayload {
    pub path: String,
}

/// Payload for the `terminal:output` event (base64-encoded raw PTY bytes).
#[derive(Clone, Serialize)]
pub struct OutputPayload {
    pub id: String,
    pub data: String,
}

/// Payload for the `terminal:exit` event.
#[derive(Clone, Serialize)]
pub struct ExitPayload {
    pub id: String,
    pub code: u32,
}

/// One matched line within a file, carried in a `SearchResultPayload`.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    /// 1-based line number.
    pub line: u32,
    /// The full matched line (trailing newline stripped).
    pub text: String,
    /// Character offset ranges [start, end) of each match within `text`.
    pub ranges: Vec<[u32; 2]>,
}

/// Payload for the `search:result` event — one file's matches, streamed as the
/// workspace walk discovers them.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultPayload {
    /// Correlates the event with the originating `start_search` call.
    pub search_id: u64,
    /// Absolute path, for opening the file.
    pub path: String,
    /// Workspace-relative path, for display.
    pub rel_path: String,
    pub matches: Vec<SearchMatch>,
}

/// Payload for the `search:done` event — the search finished (or was capped).
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchDonePayload {
    pub search_id: u64,
    /// True if results were truncated because the cap was hit.
    pub capped: bool,
}
