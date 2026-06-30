import { invoke } from "@tauri-apps/api/core";
import type { GitClient, GitDiffResult, GitStash, GitStatus } from "@jelly/sdk";

export const git: GitClient = {
  status: (workspace) => invoke<GitStatus>("git_status", { workspace }),
  diff: (workspace, path) => invoke<GitDiffResult>("git_diff", { workspace, path }),
  stage: (workspace, path) => invoke<void>("git_stage", { workspace, path }),
  unstage: (workspace, path) => invoke<void>("git_unstage", { workspace, path }),
  discard: (workspace, path) => invoke<void>("git_discard", { workspace, path }),
  commit: (workspace, message) => invoke<void>("git_commit", { workspace, message }),
  stash: (workspace, message) => invoke<void>("git_stash", { workspace, message: message ?? null }),
  stashList: (workspace) => invoke<GitStash[]>("git_stash_list", { workspace }),
  stashApply: (workspace, index) => invoke<void>("git_stash_apply", { workspace, index }),
  stashDrop: (workspace, index) => invoke<void>("git_stash_drop", { workspace, index }),
  push: (workspace) => invoke<void>("git_push", { workspace }),
  pull: (workspace) => invoke<void>("git_pull", { workspace }),
};
