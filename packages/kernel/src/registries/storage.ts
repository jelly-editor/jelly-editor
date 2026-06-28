import type { IpcClient, KeyValueStore } from "@jelly/sdk";

/**
 * In-memory per-extension key/value store. Used by tests and as a fallback when
 * no persistent backend is available.
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

// One shared, lazily-loaded snapshot of the on-disk state map, reused by every
// extension's store (they all read the same backing file).
let cache: Promise<Record<string, unknown>> | null = null;
function loadCache(ipc: IpcClient): Promise<Record<string, unknown>> {
  return (cache ??= ipc.storage.load().catch(() => ({})));
}

/**
 * Disk-backed key/value store. Keys are namespaced by extension id so all
 * extensions can share the single `state.json` backing file without collisions.
 */
export class PersistentKeyValueStore implements KeyValueStore {
  constructor(
    private readonly prefix: string,
    private readonly ipc: IpcClient,
  ) {}

  private k(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const all = await loadCache(this.ipc);
    return all[this.k(key)] as T | undefined;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const all = await loadCache(this.ipc);
    all[this.k(key)] = value;
    await this.ipc.storage.set(this.k(key), value);
  }

  async delete(key: string): Promise<void> {
    const all = await loadCache(this.ipc);
    delete all[this.k(key)];
    await this.ipc.storage.delete(this.k(key));
  }
}
