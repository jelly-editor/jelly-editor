import { open } from "@tauri-apps/plugin-dialog";

/** Native folder picker. Returns the chosen path, or null if cancelled. */
export async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return selected as string | null;
}

// Native confirm dialog, re-exported with its original signature.
export { confirm } from "@tauri-apps/plugin-dialog";
