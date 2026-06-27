import type {
  Disposable,
  KeybindingDescriptor,
  KeybindingInfo,
  KeybindingRegistry,
} from "@jelly/sdk";
import { toDisposable } from "../core/disposable";
import { parseKey, type Chord } from "./keys";

/** A binding plus its pre-parsed chord sequence, kept for fast dispatch. */
export interface ParsedBinding extends KeybindingDescriptor {
  chords: Chord[];
}

/**
 * The single source of truth for key → command bindings. Extensions contribute
 * declaratively via `contributes.keybindings` (the kernel calls `add` on
 * activation); `bind` remains for imperative use. On top of these manifest
 * *defaults*, the user may set per-command overrides (persisted to
 * `~/.jelly/keybindings.json`) — an override of `""` unbinds the command.
 *
 * The dispatcher reads `bindings()`, the cheat sheet reads `list()`, and the
 * customization UI reads `infos()` — all three see the effective set with
 * overrides applied.
 */
export class KeybindingStore implements KeybindingRegistry {
  private entries: ParsedBinding[] = [];
  /** command id → override spec (`""` = unbound). */
  private overrides = new Map<string, string>();
  private persistHook?: (overrides: Record<string, string>) => void;

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

  /** Bulk-load saved overrides before extensions activate. Skips persist. */
  hydrateOverrides(saved: Record<string, string>): void {
    for (const [command, key] of Object.entries(saved)) {
      this.overrides.set(command, key);
    }
  }

  /** Attach a hook called on every override change to write through to disk. */
  setPersistHook(hook: (overrides: Record<string, string>) => void): void {
    this.persistHook = hook;
  }

  setUserBinding(command: string, key: string): void {
    this.overrides.set(command, key);
    this.persist();
  }

  resetBinding(command: string): void {
    if (this.overrides.delete(command)) this.persist();
  }

  private persist(): void {
    this.persistHook?.(Object.fromEntries(this.overrides));
  }

  /**
   * The parsed bindings, for the dispatcher. Default entries for an overridden
   * command are dropped and replaced by the override (carrying the default's
   * `when`); an override of `""` leaves the command unbound. Later entries win
   * on conflict.
   */
  bindings(): readonly ParsedBinding[] {
    if (this.overrides.size === 0) return this.entries;
    const result: ParsedBinding[] = [];
    for (const entry of this.entries) {
      if (!this.overrides.has(entry.command)) result.push(entry);
    }
    for (const [command, key] of this.overrides) {
      if (!key) continue; // unbound
      result.push({ command, key, when: this.whenFor(command), chords: parseKey(key) });
    }
    return result;
  }

  list(): KeybindingDescriptor[] {
    return this.bindings().map(({ command, key, when }) => ({ command, key, when }));
  }

  infos(): KeybindingInfo[] {
    const defaults = new Map<string, ParsedBinding>();
    for (const entry of this.entries) {
      if (!defaults.has(entry.command)) defaults.set(entry.command, entry);
    }
    const commands = new Set<string>([...defaults.keys(), ...this.overrides.keys()]);
    return [...commands].map((command) => {
      const def = defaults.get(command);
      const override = this.overrides.get(command);
      const key = override !== undefined ? override : (def?.key ?? "");
      return {
        command,
        key,
        defaultKey: def?.key,
        when: def?.when,
        source: override !== undefined ? "user" : "default",
      };
    });
  }

  /** The `when` clause of a command's first default binding, if any. */
  private whenFor(command: string): string | undefined {
    return this.entries.find((e) => e.command === command)?.when;
  }
}
