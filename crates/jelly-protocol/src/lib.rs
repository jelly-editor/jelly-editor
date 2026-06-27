//! Shared serde types crossing the Tauri boundary, mirrored by `@jelly/sdk` on
//! the front end. Depends on nothing but serde — the backend's contract crate.

mod events;
mod fs;
mod git;

pub use events::{
    ExitPayload, FileChangedPayload, OutputPayload, SearchDonePayload, SearchMatch,
    SearchResultPayload,
};
pub use fs::DirEntry;
pub use git::{GitDiff, GitFile, GitStatus};
