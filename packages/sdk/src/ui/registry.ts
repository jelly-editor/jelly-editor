import type { ReactNode } from "react";
import type { Disposable } from "../core/disposable";
import type {
  ActivityBarItem,
  EditorSurface,
  PanelTab,
  SidebarPanel,
  StatusBarItem,
} from "./items";
import type { SlotId, SlotOpts } from "./slots";

/**
 * Extensions mount React nodes into named slots; they never know the overall
 * layout. This is what replaces the hardcoded EditorView.
 */
export interface UIRegistry {
  contributeActivityBarItem(item: ActivityBarItem): Disposable;
  /** shows when its matching activity item is active */
  contributeSidebarPanel(panel: SidebarPanel): Disposable;
  contributeStatusBarItem(item: StatusBarItem): Disposable;
  /** e.g. code editor, diff view */
  contributeEditorSurface(surface: EditorSurface): Disposable;
  /** e.g. terminal */
  contributePanelTab(tab: PanelTab): Disposable;
  /** escape hatch: mount an arbitrary node into a slot */
  mountSlot(slot: SlotId, node: ReactNode, opts?: SlotOpts): Disposable;
}
