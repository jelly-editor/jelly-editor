use serde::Serialize;

/// A single entry in a directory listing. Children are loaded lazily, so a
/// directory node carries `None` until its contents are requested (the
/// frontend tracks children; the wire type stays flat).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub ignored: bool,
}
