import { invoke } from "@tauri-apps/api/core";
import type { SearchClient, SearchOptions } from "@jelly/sdk";

export const search: SearchClient = {
  start: (searchId, opts: SearchOptions) =>
    invoke<void>("start_search", {
      searchId,
      workspace: opts.workspace,
      query: opts.query,
      caseSensitive: opts.caseSensitive,
      isRegex: opts.regex,
    }),
  cancel: () => invoke<void>("cancel_search"),
};
