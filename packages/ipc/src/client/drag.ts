import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import type { DragClient, DragSession } from "@jelly/sdk";

const DRAG_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export const drag: DragClient = {
  start: async (paths, alt, cmd, icon) => {
    const source = getCurrentWebviewWindow().label;
    await invoke<void>("drag_session_write", { paths, alt, cmd, source });
    return startDrag({ item: paths, icon: icon || DRAG_ICON, mode: alt ? "copy" : "move" }, () =>
      invoke<void>("drag_session_clear"),
    );
  },
  updateModifiers: (alt, cmd) => invoke<void>("drag_session_update_modifiers", { alt, cmd }),
  readSession: () => invoke<DragSession | null>("drag_session_read"),
  clearSession: () => invoke<void>("drag_session_clear"),
  onDrop: (handler) =>
    getCurrentWebview().onDragDropEvent(({ payload }) => {
      if (payload.type === "drop" || payload.type === "enter") {
        handler({ phase: payload.type, paths: payload.paths, x: payload.position.x, y: payload.position.y });
      } else if (payload.type === "over") {
        handler({ phase: "over", paths: [], x: payload.position.x, y: payload.position.y });
      } else {
        handler({ phase: "leave", paths: [], x: 0, y: 0 });
      }
    }),
};
