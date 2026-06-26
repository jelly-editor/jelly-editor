import { Slot } from "../Slot";

/**
 * The draggable window title bar (chrome). Extensions contribute centered
 * content (e.g. the workspace name) into the "titlebar" slot.
 */
export function TitleBar() {
  return (
    <div
      className="fixed top-0 left-0 right-0 h-[38px] z-[100] flex items-center justify-center bg-bg-elevated border-b border-border [-webkit-app-region:drag] [app-region:drag]"
      data-tauri-drag-region
    >
      <Slot slot="titlebar" />
    </div>
  );
}
