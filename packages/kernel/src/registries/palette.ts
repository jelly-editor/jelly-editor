import type { Disposable, PaletteProvider, PaletteRegistry } from "@jelly/sdk";
import { toDisposable } from "../core/disposable";

/**
 * Holds the palette providers extensions contribute, in registration order. The
 * command-palette UI reads `list()` and routes the query to the active provider
 * — it has no per-source branching of its own.
 */
export class PaletteStore implements PaletteRegistry {
  private providers: PaletteProvider[] = [];

  registerProvider(provider: PaletteProvider): Disposable {
    this.providers.push(provider);
    return toDisposable(() => {
      const i = this.providers.indexOf(provider);
      if (i >= 0) this.providers.splice(i, 1);
    });
  }

  list(): PaletteProvider[] {
    return this.providers;
  }
}
