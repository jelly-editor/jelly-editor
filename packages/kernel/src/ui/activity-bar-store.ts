import type { ActivityBarItem, Disposable } from "@jelly/sdk";
import { Store } from "../core/store";
import { toDisposable } from "../core/disposable";

const EMPTY: readonly ActivityBarItem[] = Object.freeze([]);

/**
 * Holds the activity-bar items extensions contribute, kept sorted by order so
 * the rendered rail is stable. Returns the same array until something changes,
 * so useSyncExternalStore can compare snapshots by reference.
 */
export class ActivityBarStore extends Store {
  private items: readonly ActivityBarItem[] = EMPTY;

  add(item: ActivityBarItem): Disposable {
    this.items = [...this.items, item].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    this.notify();
    return toDisposable(() => {
      const next = this.items.filter((i) => i !== item);
      if (next.length === this.items.length) return;
      this.items = next.length ? next : EMPTY;
      this.notify();
    });
  }

  getItems = (): readonly ActivityBarItem[] => this.items;
}
