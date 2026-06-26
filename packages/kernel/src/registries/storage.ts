import type { KeyValueStore } from "@jelly/sdk";

/**
 * In-memory per-extension key/value store. Each extension gets its own
 * instance, so keys are naturally isolated. Real persistence lands in Phase 6.
 */
export class MemoryKeyValueStore implements KeyValueStore {
  private map = new Map<string, unknown>();

  async get<T = unknown>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}
