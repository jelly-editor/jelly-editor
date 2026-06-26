import type { Disposable, SlotId } from "@jelly/sdk";
import type { ReactNode } from "react";
import { toDisposable } from "../core/disposable";

/** A single thing mounted into a slot. */
export interface SlotContribution {
  slot: SlotId;
  id: string;
  order: number;
  render: () => ReactNode;
}

const EMPTY: readonly SlotContribution[] = Object.freeze([]);

/**
 * Reactive store of slot contributions. Holds an immutable array per slot so
 * React's useSyncExternalStore can compare snapshots by reference: `get(slot)`
 * returns the same array until that slot actually changes.
 */
export class SlotStore {
  private slots = new Map<SlotId, readonly SlotContribution[]>();
  private listeners = new Set<() => void>();
  private auto = 0;

  add(
    slot: SlotId,
    render: () => ReactNode,
    opts?: { id?: string; order?: number },
  ): Disposable {
    const contribution: SlotContribution = {
      slot,
      id: opts?.id ?? `${slot}#${this.auto++}`,
      order: opts?.order ?? 0,
      render,
    };
    const current = this.slots.get(slot) ?? EMPTY;
    const next = [...current, contribution].sort((a, b) => a.order - b.order);
    this.slots.set(slot, next);
    this.notify();

    return toDisposable(() => {
      const list = this.slots.get(slot);
      if (!list) return;
      const filtered = list.filter((c) => c !== contribution);
      if (filtered.length === list.length) return;
      this.slots.set(slot, filtered.length ? filtered : EMPTY);
      this.notify();
    });
  }

  /** Stable snapshot of a slot's contributions (sorted by order). */
  get(slot: SlotId): readonly SlotContribution[] {
    return this.slots.get(slot) ?? EMPTY;
  }

  /** Subscribe to any slot change. Stable identity, safe for useSyncExternalStore. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
