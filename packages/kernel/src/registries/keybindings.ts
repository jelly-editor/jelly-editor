import type { Disposable, KeybindingRegistry } from "@jelly/sdk";
import { toDisposable } from "../core/disposable";

/** Maps key (or chord) strings to command ids. Resolution wiring lands later. */
export class KeybindingStore implements KeybindingRegistry {
  private bindings = new Map<string, string>();

  bind(key: string, commandId: string): Disposable {
    this.bindings.set(key, commandId);
    return toDisposable(() => {
      if (this.bindings.get(key) === commandId) this.bindings.delete(key);
    });
  }

  /** Look up the command bound to a key, if any. */
  resolve(key: string): string | undefined {
    return this.bindings.get(key);
  }
}
