import type { SlotId } from "@jelly/sdk";
import { Fragment, useSyncExternalStore } from "react";
import { useKernel } from "./kernel-context";

export interface SlotProps {
  slot: SlotId;
  /** rendered when nothing is contributed to this slot */
  fallback?: React.ReactNode;
}

/**
 * Renders everything contributed to a named slot, in order. Re-renders when the
 * slot's contributions change. Empty slots render their fallback (or nothing).
 */
export function Slot({ slot, fallback = null }: SlotProps) {
  const kernel = useKernel();
  const contributions = useSyncExternalStore(
    kernel.slots.subscribe,
    () => kernel.slots.get(slot),
  );

  if (contributions.length === 0) return <>{fallback}</>;

  return (
    <>
      {contributions.map((c) => (
        <Fragment key={c.id}>{c.render()}</Fragment>
      ))}
    </>
  );
}
