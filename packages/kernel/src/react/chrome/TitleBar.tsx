import { Slot } from "../Slot";

/**
 * The draggable window title bar (chrome). Extensions contribute centered
 * content (e.g. the workspace name) into the "titlebar" slot, and left-aligned
 * content (e.g. the folder switcher) into the "folder-switcher" slot.
 *
 * The folder-switcher offset is controlled via --folder-switcher-left (default
 * 76px). Extensions that detect fullscreen can update that CSS var on :root.
 */
export function TitleBar() {
  return (
    <div
      className="fixed top-0 left-0 right-0 h-[38px] z-[100] flex items-center justify-center bg-bg-elevated border-b border-border [-webkit-app-region:drag] [app-region:drag]"
      data-tauri-drag-region
    >
      <div
        className="absolute inset-y-0 flex items-center gap-[4px] [-webkit-app-region:no-drag] transition-[left] duration-[80ms]"
        style={{ left: "var(--folder-switcher-left, 76px)" }}
      >
        <Slot slot="folder-switcher" />
      </div>
      <Slot slot="titlebar" />
    </div>
  );
}
