import type { Disposable } from "@jelly/sdk";
import type { CommandBus } from "../registries/commands";
import type { ContextKeyStore } from "../registries/context-keys";
import type { KeybindingStore, ParsedBinding } from "../registries/keybindings";
import { isModifierEvent, matchChord } from "../registries/keys";

/** How long a chord stays "armed" waiting for its second stroke. */
const CHORD_TIMEOUT_MS = 1500;

/**
 * The single global key listener. It matches a keydown against the binding
 * store (honoring each binding's `when` and platform modifiers), supports
 * two-stroke chords, and executes the resolved command. This replaces every
 * ad-hoc `window.addEventListener("keydown", ...)` an extension used to add.
 */
export class KeyDispatcher {
  private armed: ParsedBinding[] = [];
  private armedAt = 0;

  constructor(
    private readonly keybindings: KeybindingStore,
    private readonly commands: CommandBus,
    private readonly context: ContextKeyStore,
  ) {}

  /** Attach to a window; returns a Disposable that detaches the listener. */
  attach(target: Window): Disposable {
    const onKeyDown = (e: KeyboardEvent) => this.handle(e);
    target.addEventListener("keydown", onKeyDown);
    return { dispose: () => target.removeEventListener("keydown", onKeyDown) };
  }

  private handle(e: KeyboardEvent): void {
    if (isModifierEvent(e)) return; // wait for a real key with the modifier held

    const enabled = (b: ParsedBinding) => this.context.evaluate(b.when);

    // Mid-chord: try to complete an armed two-stroke binding.
    if (this.armed.length && Date.now() - this.armedAt <= CHORD_TIMEOUT_MS) {
      const completed = this.armed.find((b) => matchChord(b.chords[1], e) && enabled(b));
      this.armed = [];
      if (completed) {
        this.run(e, completed);
        return;
      }
      // fall through: treat this stroke as a fresh start
    } else {
      this.armed = [];
    }

    const all = this.keybindings.bindings();

    // Single-stroke match wins immediately. Later bindings take precedence.
    const single = lastMatch(all, (b) => b.chords.length === 1 && matchChord(b.chords[0], e) && enabled(b));
    if (single) {
      this.run(e, single);
      return;
    }

    // Otherwise, arm any chord whose first stroke matches.
    const firsts = all.filter((b) => b.chords.length > 1 && matchChord(b.chords[0], e) && enabled(b));
    if (firsts.length) {
      this.armed = firsts;
      this.armedAt = Date.now();
      e.preventDefault();
    }
  }

  private run(e: KeyboardEvent, binding: ParsedBinding): void {
    e.preventDefault();
    void this.commands.execute(binding.command).catch((err) => {
      console.error(`[kernel] keybinding ${binding.key} → ${binding.command} failed`, err);
    });
  }
}

function lastMatch(items: readonly ParsedBinding[], pred: (b: ParsedBinding) => boolean): ParsedBinding | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (pred(items[i])) return items[i];
  }
  return undefined;
}
