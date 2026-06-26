import type {
  ActivityBarItem,
  Disposable,
  EditorSurface,
  PanelTab,
  SidebarPanel,
  SlotId,
  SlotOpts,
  StatusBarItem,
  UIRegistry,
} from "@jelly/sdk";
import type { ReactNode } from "react";
import type { ActivityBarStore } from "./activity-bar-store";
import type { SlotStore } from "./slot-store";

/**
 * Translates the typed `contribute*` calls into store entries. Activity-bar
 * items carry metadata (icon/onSelect/align), so they live in their own store;
 * everything else reduces to a render thunk in a named slot.
 */
export class KernelUIRegistry implements UIRegistry {
  constructor(
    private readonly slots: SlotStore,
    private readonly activityBar: ActivityBarStore,
  ) {}

  contributeActivityBarItem(item: ActivityBarItem): Disposable {
    return this.activityBar.add(item);
  }

  contributeSidebarPanel(panel: SidebarPanel): Disposable {
    return this.slots.add("sidebar.panel", panel.render, { id: panel.id });
  }

  contributeStatusBarItem(item: StatusBarItem): Disposable {
    const slot: SlotId = item.align === "right" ? "statusbar.right" : "statusbar.left";
    return this.slots.add(slot, item.render, { id: item.id, order: item.order });
  }

  contributeEditorSurface(surface: EditorSurface): Disposable {
    return this.slots.add("editor.surface", () => surface.render({ uri: "" }), {
      id: surface.id,
    });
  }

  contributePanelTab(tab: PanelTab): Disposable {
    return this.slots.add("panel.tab", tab.render, { id: tab.id });
  }

  mountSlot(slot: SlotId, node: ReactNode, opts?: SlotOpts): Disposable {
    return this.slots.add(slot, () => node, { id: opts?.id, order: opts?.order });
  }
}
