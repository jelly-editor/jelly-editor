import type { Disposable } from "../core/disposable";

/**
 * Cross-extension and core→frontend signals, by name. Replaces direct calls
 * between features (e.g. "a file was saved" → git refreshes without importing
 * the files extension).
 */
export interface EventBus {
  on<T = unknown>(event: string, handler: (payload: T) => void): Disposable;
  emit<T = unknown>(event: string, payload: T): void;
}
