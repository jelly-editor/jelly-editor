import { Slot } from "../Slot";

/** The bottom status bar. Extensions fill the left and right slots. */
export function StatusBar() {
  return (
    <div className="flex items-center h-[22px] px-2 bg-bg-elevated border-t border-border text-[11px] text-text-muted shrink-0 select-none">
      <div className="flex items-center gap-3">
        <Slot slot="statusbar.left" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Slot slot="statusbar.right" />
      </div>
    </div>
  );
}
