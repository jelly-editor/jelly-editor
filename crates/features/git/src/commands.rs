//! Git feature: stateless Tauri commands backed by libgit2 (git2). Each command
//! opens the repository at the given workspace, so there's no managed state and
//! no `register` — the app just lists these commands in `generate_handler!`.

use std::path::Path;

use git2::{Repository, Status, StatusOptions};
use jelly_protocol::{GitDiff, GitFile, GitStash, GitStatus};

/// Cap untracked entries sent to the front end so an unignored `node_modules`
/// can't flood the IPC payload or the panel. The warning prompts the user to
/// add a `.gitignore`; until then we just stop collecting past this point.
const MAX_UNTRACKED: usize = 5000;

fn open(workspace: &str) -> Result<Repository, String> {
    Repository::discover(workspace).map_err(|e| e.to_string())
}

fn current_branch(repo: &Repository) -> String {
    if let Ok(head) = repo.head() {
        return head.shorthand().unwrap_or("HEAD").to_string();
    }
    // Unborn branch (no commits yet): read the symbolic ref name.
    if let Ok(r) = repo.find_reference("HEAD") {
        if let Ok(Some(target)) = r.symbolic_target() {
            return target.rsplit('/').next().unwrap_or("main").to_string();
        }
    }
    "main".to_string()
}

#[tauri::command]
pub fn git_status(workspace: String) -> Result<GitStatus, String> {
    let repo = match open(&workspace) {
        Ok(r) => r,
        Err(_) => {
            return Ok(GitStatus {
                branch: String::new(),
                staged: vec![],
                modified: vec![],
                untracked: vec![],
                is_repo: false,
            })
        }
    };

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut staged = vec![];
    let mut modified = vec![];
    let mut untracked = vec![];

    for entry in statuses.iter() {
        let s = entry.status();
        let path = entry.path().unwrap_or_default().to_string();

        // Index (staged) side
        if s.contains(Status::INDEX_NEW) {
            staged.push(GitFile { path: path.clone(), status: "added".into() });
        } else if s.contains(Status::INDEX_MODIFIED) {
            staged.push(GitFile { path: path.clone(), status: "modified".into() });
        } else if s.contains(Status::INDEX_DELETED) {
            staged.push(GitFile { path: path.clone(), status: "deleted".into() });
        } else if s.contains(Status::INDEX_RENAMED) {
            staged.push(GitFile { path: path.clone(), status: "renamed".into() });
        } else if s.contains(Status::INDEX_TYPECHANGE) {
            staged.push(GitFile { path: path.clone(), status: "modified".into() });
        }

        // Working-tree side
        if s.contains(Status::WT_NEW) {
            if untracked.len() < MAX_UNTRACKED {
                untracked.push(GitFile { path: path.clone(), status: "untracked".into() });
            }
        } else if s.contains(Status::WT_MODIFIED) || s.contains(Status::WT_TYPECHANGE) {
            modified.push(GitFile { path: path.clone(), status: "modified".into() });
        } else if s.contains(Status::WT_DELETED) {
            modified.push(GitFile { path: path.clone(), status: "deleted".into() });
        } else if s.contains(Status::WT_RENAMED) {
            modified.push(GitFile { path: path.clone(), status: "renamed".into() });
        }
    }

    Ok(GitStatus {
        branch: current_branch(&repo),
        staged,
        modified,
        untracked,
        is_repo: true,
    })
}

/// HEAD version (original) vs working-tree version (modified) for a file.
#[tauri::command]
pub fn git_diff(workspace: String, path: String) -> Result<GitDiff, String> {
    let repo = open(&workspace)?;

    let original = head_blob(&repo, &path).unwrap_or_default();

    let abs = repo.workdir().ok_or("Bare repository")?.join(&path);
    let modified = std::fs::read_to_string(&abs).unwrap_or_default();

    Ok(GitDiff { original, modified })
}

fn head_blob(repo: &Repository, relpath: &str) -> Option<String> {
    let tree = repo.head().ok()?.peel_to_tree().ok()?;
    let entry = tree.get_path(Path::new(relpath)).ok()?;
    let blob = repo.find_blob(entry.id()).ok()?;
    Some(String::from_utf8_lossy(blob.content()).into_owned())
}

#[tauri::command]
pub fn git_stage(workspace: String, path: String) -> Result<(), String> {
    let repo = open(&workspace)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let rel = Path::new(&path);

    let abs = repo.workdir().ok_or("Bare repository")?.join(&path);
    if abs.exists() {
        index.add_path(rel).map_err(|e| e.to_string())?;
    } else {
        // File was deleted — stage the removal.
        index.remove_path(rel).map_err(|e| e.to_string())?;
    }
    index.write().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_unstage(workspace: String, path: String) -> Result<(), String> {
    let repo = open(&workspace)?;
    let head = repo.head().ok().and_then(|h| h.peel(git2::ObjectType::Commit).ok());
    match head {
        // Reset the path in the index back to HEAD.
        Some(obj) => repo
            .reset_default(Some(&obj), [Path::new(&path)])
            .map_err(|e| e.to_string()),
        // No commits yet: remove the path from the index.
        None => {
            let mut index = repo.index().map_err(|e| e.to_string())?;
            index.remove_path(Path::new(&path)).map_err(|e| e.to_string())?;
            index.write().map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub fn git_discard(workspace: String, path: String) -> Result<(), String> {
    let repo = open(&workspace)?;
    let workdir = repo.workdir().ok_or("Bare repository")?;
    let rel = Path::new(&path);

    // Untracked files have no committed version to restore — delete them.
    let status = repo.status_file(rel).map_err(|e| e.to_string())?;
    if status.contains(Status::WT_NEW) {
        let abs = workdir.join(&path);
        let res = if abs.is_dir() {
            std::fs::remove_dir_all(&abs)
        } else {
            std::fs::remove_file(&abs)
        };
        return res.map_err(|e| e.to_string());
    }

    // Tracked: restore the working-tree file to its HEAD version.
    let mut checkout = git2::build::CheckoutBuilder::new();
    checkout.path(rel).force();
    repo.checkout_head(Some(&mut checkout)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_commit(workspace: String, message: String) -> Result<(), String> {
    if message.trim().is_empty() {
        return Err("Commit message is empty".into());
    }
    let repo = open(&workspace)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let sig = repo
        .signature()
        .map_err(|_| "No git identity configured (set user.name and user.email)".to_string())?;

    let parent = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent.iter().collect();

    repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_stash(workspace: String, message: Option<String>) -> Result<(), String> {
    let mut repo = open(&workspace)?;
    let sig = repo
        .signature()
        .map_err(|_| "No git identity configured (set user.name and user.email)".to_string())?;
    let msg = message.as_deref().unwrap_or("");
    repo.stash_save(&sig, msg, None).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_stash_list(workspace: String) -> Result<Vec<GitStash>, String> {
    let mut repo = open(&workspace)?;
    let mut stashes = Vec::new();
    repo.stash_foreach(|index, message, _oid| {
        stashes.push(GitStash { index, message: message.to_string() });
        true
    })
    .map_err(|e| e.to_string())?;
    Ok(stashes)
}

#[tauri::command]
pub fn git_stash_apply(workspace: String, index: usize) -> Result<(), String> {
    let mut repo = open(&workspace)?;
    repo.stash_apply(index, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_stash_drop(workspace: String, index: usize) -> Result<(), String> {
    let mut repo = open(&workspace)?;
    repo.stash_drop(index).map_err(|e| e.to_string())
}

const GIT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(60);

async fn run_git(workspace: &str, args: &[&str]) -> Result<(), String> {
    let child = tokio::process::Command::new("git")
        .args(args)
        .current_dir(workspace)
        .output();
    match tokio::time::timeout(GIT_TIMEOUT, child).await {
        Err(_) => Err(format!("git {} timed out after 60s", args[0])),
        Ok(Err(e)) => Err(e.to_string()),
        Ok(Ok(out)) => {
            if out.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&out.stderr);
                let stdout = String::from_utf8_lossy(&out.stdout);
                let msg = [stderr.trim(), stdout.trim()]
                    .iter()
                    .filter(|s| !s.is_empty())
                    .cloned()
                    .collect::<Vec<_>>()
                    .join("\n");
                Err(msg)
            }
        }
    }
}

#[tauri::command]
pub async fn git_push(workspace: String) -> Result<(), String> {
    run_git(&workspace, &["push"]).await
}

#[tauri::command]
pub async fn git_pull(workspace: String) -> Result<(), String> {
    run_git(&workspace, &["pull"]).await
}
