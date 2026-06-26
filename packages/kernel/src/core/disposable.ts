import type { Disposable } from "@jelly/sdk";

/** Wrap a teardown function as a Disposable that runs at most once. */
export function toDisposable(fn: () => void): Disposable {
  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      fn();
    },
  };
}

/** Dispose every disposable in the list, swallowing individual errors, then empty it. */
export function disposeAll(items: Disposable[]): void {
  while (items.length) {
    const d = items.pop()!;
    try {
      d.dispose();
    } catch (err) {
      // a leaky teardown must not block the rest
      console.error("[kernel] disposable threw during dispose:", err);
    }
  }
}
