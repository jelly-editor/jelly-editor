/**
 * Minimal observable base for kernel stores that back React via
 * useSyncExternalStore: a stable `subscribe` and a `notify` for subclasses.
 */
export class Store {
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  protected notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
