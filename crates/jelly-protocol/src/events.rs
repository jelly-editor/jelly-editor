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
