import type { ActivityBarItem, SlotId } from "@jelly/sdk";
import { useSyncExternalStore } from "react";
import type { PendingDialog } from "../ui/dialog-store";
import type { ActiveNotification } from "../ui/notification-store";
import type { SlotContribution } from "../ui/slot-store";
import type { WorkbenchState } from "../ui/workbench";
import { useKernel } from "./kernel-context";

/** Reactive workbench layout state (workspaceOpen, activePanelId, sidebarWidth). */
export function useWorkbenchState(): WorkbenchState {
  const kernel = useKernel();
  return useSyncExternalStore(kernel.workbench.subscribe, kernel.workbench.getState);
}

/** Reactive list of contributed activity-bar items, sorted by order. */
export function useActivityBarItems(): readonly ActivityBarItem[] {
  const kernel = useKernel();
  return useSyncExternalStore(kernel.activityBar.subscribe, kernel.activityBar.getItems);
}

/** Reactive contributions for a slot, sorted by order. */
export function useSlotContributions(slot: SlotId): readonly SlotContribution[] {
  const kernel = useKernel();
  return useSyncExternalStore(kernel.slots.subscribe, () => kernel.slots.get(slot));
}

/** The dialog currently requested by an extension, or null. */
export function useCurrentDialog(): PendingDialog | null {
  const kernel = useKernel();
  return useSyncExternalStore(kernel.dialog.subscribe, kernel.dialog.current);
}

/** Reactive list of active notifications, oldest first. */
export function useNotifications(): readonly ActiveNotification[] {
  const kernel = useKernel();
  return useSyncExternalStore(kernel.notifications.subscribe, kernel.notifications.list);
}
