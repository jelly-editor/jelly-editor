import type { Disposable, EventBus } from "@jelly/sdk";
import { toDisposable } from "../core/disposable";

type AnyHandler = (payload: any) => void;

/** In-memory pub/sub keyed by event name. */
export class Emitter implements EventBus {
  private listeners = new Map<string, Set<AnyHandler>>();

  on<T = unknown>(event: string, handler: (payload: T) => void): Disposable {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as AnyHandler);
    return toDisposable(() => {
      const s = this.listeners.get(event);
      if (!s) return;
      s.delete(handler as AnyHandler);
      if (s.size === 0) this.listeners.delete(event);
    });
  }

  emit<T = unknown>(event: string, payload: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // iterate a copy so handlers may subscribe/unsubscribe during emit
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[kernel] event handler for "${event}" threw:`, err);
      }
    }
  }
}
