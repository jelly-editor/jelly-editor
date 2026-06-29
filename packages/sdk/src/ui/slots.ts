/** The fixed set of layout slots the kernel owns. Extensions mount into them. */
export type SlotId =
  | "welcome"
  | "titlebar"
  | "activitybar"
  | "folder-switcher"
  | "sidebar.panel"
  | "editor.surface"
  | "panel.tab"
  | "statusbar.left"
  | "statusbar.right"
  | "modal"
  | "context-menu";

export interface SlotOpts {
  /** stable identity within the slot (defaults to an auto id) */
  id?: string;
  /** lower renders first */
  order?: number;
}
