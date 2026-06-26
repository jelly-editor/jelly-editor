import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

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
  });
}
