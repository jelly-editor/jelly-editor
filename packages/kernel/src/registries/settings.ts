import type { Disposable, SettingsRegistry, SettingsSchema } from "@jelly/sdk";
import { toDisposable } from "../core/disposable";

/** Kernel-wide settings store with optional disk persistence. */
export class SettingsStore implements SettingsRegistry {
  private values = new Map<string, unknown>();
  private watchers = new Map<string, Set<(value: unknown) => void>>();
  private persistHook?: (key: string, value: unknown) => void;

  /** Bulk-load saved values before extensions activate. Skips watchers and persist. */
  hydrate(saved: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(saved)) {
      this.values.set(key, value);
    }
  }

  /** Attach a hook that is called on every set() to write through to disk. */
  setPersistHook(hook: (key: string, value: unknown) => void): void {
    this.persistHook = hook;
  }

  defineSchema(schema: SettingsSchema): void {
    for (const [key, entry] of Object.entries(schema)) {
      if (!this.values.has(key) && entry.default !== undefined) {
        this.values.set(key, entry.default);
      }
    }
  }

  get<T = unknown>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  set<T = unknown>(key: string, value: T): void {
    this.values.set(key, value);
    this.persistHook?.(key, value as unknown);
    const set = this.watchers.get(key);
    if (!set) return;
    for (const handler of [...set]) handler(value);
  }

  onChange(key: string, handler: (value: unknown) => void): Disposable {
    let set = this.watchers.get(key);
    if (!set) {
      set = new Set();
      this.watchers.set(key, set);
    }
    set.add(handler);
    return toDisposable(() => {
      const s = this.watchers.get(key);
      if (!s) return;
      s.delete(handler);
      if (s.size === 0) this.watchers.delete(key);
    });
  }
}
