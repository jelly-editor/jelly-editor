import { ipc } from "@jelly/ipc";
import { useGitStore } from "./store";

/** Re-fetch git status for the current workspace into the git store. */
export async function refreshGitStatus() {
  const workspace = useGitStore.getState().workspacePath;
  if (!workspace) return;
  try {
    const status = await ipc.git.status(workspace);
    useGitStore.getState().setStatus(status);
  } catch {
    /* not a repo / git unavailable — leave store as-is */
  }
}
