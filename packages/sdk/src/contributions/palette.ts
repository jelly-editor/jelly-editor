import type { Disposable } from "../core/disposable";

/** A single row in the command palette, produced by a provider. */
export interface PaletteItem {
  id: string;
  label: string;
  /** right-aligned secondary text (e.g. a file path or command id) */
  detail?: string;
  /** right-aligned, pre-formatted keybinding hint (e.g. "⌘⇧F") */
  hint?: string;
  /** run when the item is chosen; the palette closes afterward */
  onAccept: () => void;
}

/**
 * A source of palette items. The palette is otherwise generic: it routes the
 * query to the active provider and renders whatever items come back. Any
 * extension can contribute one, the same way it contributes commands or panels.
 */
export interface PaletteProvider {
  id: string;
  /** Non-empty prefix that switches to this provider when typed (e.g. ">"). */
  prefix?: string;
  placeholder?: string;
  /** Produce items for the (prefix-stripped) query; provider filters/sorts. */
  getItems(query: string): PaletteItem[] | Promise<PaletteItem[]>;
}

export interface PaletteRegistry {
  registerProvider(provider: PaletteProvider): Disposable;
  list(): PaletteProvider[];
}
