import { ipc } from "@jelly/ipc";
import { useGitStore } from "./store";

/** Re-fetch git status and stash list for the current workspace into the git store. */
export async function refreshGitStatus() {
  const workspace = useGitStore.getState().workspacePath;
  if (!workspace) return;
  try {
    const [status, stashes] = await Promise.all([
      ipc.git.status(workspace),
      ipc.git.stashList(workspace),
    ]);
    useGitStore.getState().setStatus(status);
    useGitStore.getState().setStashes(stashes);
  } catch {
    /* not a repo / git unavailable — leave store as-is */
  }
}
