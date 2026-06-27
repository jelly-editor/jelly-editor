# Command System — Commands, Keybindings, and Palette Providers

## Command registry

Commands decouple *intent* from *implementation* and from *keybindings*. Anything
invocable is a named command (`"files.reveal"`, `"git.commit"`). The activity bar, the
command palette, and keybindings all dispatch by id.

```ts
interface CommandRegistry {
  register(id: string, handler: (...args: unknown[]) => unknown): Disposable;
  execute<T = unknown>(id: string, ...args: unknown[]): Promise<T>;
}
```

---

## Keybindings

Keybindings are **data, not listeners**. An extension declares them in its manifest
(`contributes.keybindings`); on activation the kernel registers each into the central
`KeybindingStore` (tracked on the extension's subscriptions, so they vanish on
deactivate). A **single** global dispatcher — `kernel.installKeyDispatch(window)`,
attached once at boot — matches each keydown against the store and runs the bound
command. Extensions never add their own `window` keydown listeners for commands.

- **`key`** is one or more space-separated chords (`"mod+k mod+s"`). `mod` is the
  platform-primary modifier (⌘ on macOS, Ctrl elsewhere); `ctrl` is always the
  literal Control key, so `"ctrl+\`"` stays Control on a Mac.
- **`when`** gates a binding on a context key (`"workspaceOpen"`, `"!terminalFocused"`).
  Context keys live in a small reactive `ContextKeyStore`; the kernel seeds
  `workspaceOpen` from the workbench. The `when` grammar is intentionally tiny —
  identifiers, `!`, `&&`, `||`.
- Because every binding is one inspectable record, `keybindings.list()` powers the
  **Keyboard Shortcuts** cheat sheet (and key hints in the command palette) for free.
- **User overrides** layer on top of the manifest defaults. The Settings modal's
  *Keybindings* tab calls `setUserBinding(command, key)` / `resetBinding(command)`;
  the store persists the override map to `~/.jelly/keybindings.json` (via
  `ipc.keybindings`) and `kernel.init()` hydrates it on boot — *before* extensions
  activate, since overrides reference commands by id, not the default entries.
  `list()`/`bindings()` always return the **effective** set (overrides applied, `""`
  = unbound); `infos()` adds provenance (`defaultKey`, `source`) for the editor UI.

```ts
interface KeybindingRegistry {
  bind(key: string, commandId: string): Disposable;
  list(): KeybindingDescriptor[];      // effective bindings, for the cheat sheet
  infos(): KeybindingInfo[];           // effective + provenance, for the editor UI
  setUserBinding(command: string, key: string): void; // "" unbinds; persisted
  resetBinding(command: string): void; // drop the override, restore the default
}
```

---

## Palette providers

The command palette has **no per-source branching**. It's a generic shell that
routes the query to a **provider** and renders whatever items come back. Each
source — go-to-file, commands, keyboard shortcuts — is a `PaletteProvider`
contributed via `ctx.palette.registerProvider(...)`, exactly like commands or
panels are contributed. Adding a new source (git branches, symbols, …) means
registering a provider; the palette never changes.

```ts
interface PaletteProvider {
  id: string;
  prefix?: string;       // non-empty prefix that switches to it when typed (">", "?")
  placeholder?: string;
  getItems(query: string): PaletteItem[] | Promise<PaletteItem[]>;
}
interface PaletteItem {
  id: string; label: string;
  detail?: string;       // right-aligned secondary text (path, command id)
  hint?: string;         // right-aligned keybinding hint
  onAccept(): void;      // run on Enter; the palette closes afterward
}
```

Ownership follows the feature: the **files** provider lives in `@jelly/files`,
the **commands** and **shortcuts** providers in `@jelly/command-palette`. A typed
prefix (`>` commands, `?` shortcuts) switches provider mid-query; otherwise the
palette opens to whichever provider the triggering command selected.
