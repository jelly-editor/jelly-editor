import { invoke } from "@tauri-apps/api/core";
import type { TerminalClient } from "@jelly/sdk";

export const terminal: TerminalClient = {
  create: (id, cwd, cols, rows) => invoke<void>("create_terminal", { id, cwd, cols, rows }),
  input: (id, data) => invoke<void>("terminal_input", { id, data }),
  resize: (id, cols, rows) => invoke<void>("terminal_resize", { id, cols, rows }),
  close: (id) => invoke<void>("close_terminal", { id }),
};
