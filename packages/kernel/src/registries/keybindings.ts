import type { Disposable, KeybindingDescriptor, KeybindingRegistry } from "@jelly/sdk";
import { toDisposable } from "../core/disposable";
import { parseKey, type Chord } from "./keys";

/** A binding plus its pre-parsed chord sequence, kept for fast dispatch. */
export interface ParsedBinding extends KeybindingDescriptor {
  chords: Chord[];
}

/**
 * The single source of truth for key → command bindings. Extensions contribute
 * declaratively via `contributes.keybindings` (the kernel calls `add` on
 * activation); `bind` remains for imperative use. The dispatcher reads
 * `bindings()`, and the cheat sheet / customization UI read `list()`.
 */
export class KeybindingStore implements KeybindingRegistry {
  private entries: ParsedBinding[] = [];

  /** Register a full descriptor (key, command, optional `when`). */
  add(desc: KeybindingDescriptor): Disposable {
    const entry: ParsedBinding = { ...desc, chords: parseKey(desc.key) };
    this.entries.push(entry);
    return toDisposable(() => {
      const i = this.entries.indexOf(entry);
      if (i >= 0) this.entries.splice(i, 1);
    });
  }

  /** Imperative shorthand: bind a key to a command id. */
  bind(key: string, commandId: string): Disposable {
    return this.add({ key, command: commandId });
  }

  /** The parsed bindings, for the dispatcher. Later entries win on conflict. */
  bindings(): readonly ParsedBinding[] {
    return this.entries;
  }

  list(): KeybindingDescriptor[] {
    return this.entries.map(({ command, key, when }) => ({ command, key, when }));
  }
}
