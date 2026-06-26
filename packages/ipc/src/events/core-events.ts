/**
 * The core events the Rust backend emits to the frontend, with their payloads.
 * The bridge re-emits these onto the kernel EventBus under the same names.
 */
export interface CoreEventMap {
  "file:changed_externally": { path: string };
  /** payload is the saved file's path */
  "file:saved": string;
  "terminal:output": { id: string; data: string };
  "terminal:exit": { id: string; code?: number };
}

export type CoreEventName = keyof CoreEventMap;

export const CORE_EVENT_NAMES: CoreEventName[] = [
  "file:changed_externally",
  "file:saved",
  "terminal:output",
  "terminal:exit",
];
