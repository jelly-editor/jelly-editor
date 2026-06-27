import { ipc } from "@jelly/ipc";
import type { SearchFileResult } from "@jelly/sdk";
import { useSearchStore } from "./store";
import { runSearch } from "./run";

/**
 * Replace matches across the given files. `lines` optionally restricts each
 * file to specific 1-based line numbers (used for per-row / per-file actions);
 * omit it to replace every match in each file. Re-runs the search afterwards so
 * the results reflect the edits.
 */
async function replace(files: SearchFileResult[], lines?: (r: SearchFileResult) => number[]) {
  const s = useSearchStore.getState();
  if (!s.query || files.length === 0 || s.replacing) return;

  s.setReplacing(true);
  try {
    await Promise.all(
      files.map((r) =>
        ipc.search
          .replace({
            path: r.path,
            query: s.query,
            replacement: s.replacement,
            caseSensitive: s.caseSensitive,
            regex: s.regex,
            lines: lines ? lines(r) : null,
          })
          .catch(() => 0),
      ),
    );
  } finally {
    s.setReplacing(false);
    await runSearch();
  }
}

export function replaceAll() {
  return replace(useSearchStore.getState().results);
}

export function replaceFile(result: SearchFileResult) {
  return replace([result]);
}

export function replaceLine(result: SearchFileResult, line: number) {
  return replace([result], () => [line]);
}
