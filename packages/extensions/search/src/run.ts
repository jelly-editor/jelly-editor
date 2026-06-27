import { ipc } from "@jelly/ipc";
import { useSearchStore } from "./store";

/** Monotonic ids so the store and backend can drop stale searches. */
let nextId = 1;

/**
 * Kick off a search for the current query/options against the open workspace.
 * Clears results for an empty query and surfaces invalid-regex errors.
 */
export async function runSearch(): Promise<void> {
  const s = useSearchStore.getState();
  const query = s.query;

  if (!query || !s.workspacePath) {
    void ipc.search.cancel().catch(() => {});
    s.clear();
    return;
  }

  const id = nextId++;
  s.beginSearch(id);
  try {
    await ipc.search.start(id, {
      workspace: s.workspacePath,
      query,
      caseSensitive: s.caseSensitive,
      regex: s.regex,
    });
  } catch (e) {
    s.failSearch(String(e));
  }
}
