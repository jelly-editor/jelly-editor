import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";

/** Open a fresh editor window (the ⌘⇧N "new window" action). */
export function openEditorWindow(): WebviewWindow {
  const label = `welcome_${Date.now()}`;
  return new WebviewWindow(label, {
    url: "/",
    title: "",
    width: 1200,
    height: 800,
    titleBarStyle: "overlay",
    backgroundColor: { red: 14, green: 14, blue: 12, alpha: 255 },
    dragDropEnabled: true,
  });
}

export function getCurrentWindowLabel(): string {
  return getCurrentWebviewWindow().label;
}

/**
 * Returns the initial path queued for this window by a CLI invocation (`jelly .`),
 * or null if the window was opened normally. Consumes the value (one-shot).
 */
export async function getInitialPath(): Promise<string | null> {
  const label = getCurrentWebviewWindow().label;
  return invoke<string | null>("get_initial_path_for", { label });
}

export interface InstallResult {
  scriptPath: string;
  shellConfig: string | null;
  pathAdded: boolean;
}

/** Install `jelly` to `~/.local/bin` and add it to PATH in the user's shell config. */
export async function installShellCommand(): Promise<InstallResult> {
  return invoke<InstallResult>("install_shell_command");
}
