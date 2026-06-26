import { invoke } from "@tauri-apps/api/core";
import type { GitClient, GitDiffResult, GitStatus } from "@jelly/sdk";

export const git: GitClient = {
  status: (workspace) => invoke<GitStatus>("git_status", { workspace }),
  diff: (workspace, path) => invoke<GitDiffResult>("git_diff", { workspace, path }),
  stage: (workspace, path) => invoke<void>("git_stage", { workspace, path }),
  unstage: (workspace, path) => invoke<void>("git_unstage", { workspace, path }),
  commit: (workspace, message) => invoke<void>("git_commit", { workspace, message }),
};
