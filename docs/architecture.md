# Jelly — Architecture (Extension-based)

## Overview

Jelly is a Tauri v2 desktop code editor, architected as a **monorepo of small
packages** where every feature — file tree, editor, terminal, git — is a
self-contained **extension** that plugs into a thin host.

The guiding principle:

> The app shell is a thin **host**. It boots a **kernel** (a registry + command/event
> buses + a layout-slot system). Every feature is an **extension** that `activate(ctx)`s
> itself and *contributes* into the kernel. **No extension imports another extension.**

Our own built-in features use the exact same API a future third-party add-on would use.
That is what makes runtime-loaded extensions possible later without re-architecting:
loading an add-on becomes "call `activate(ctx)` on a module fetched from disk" instead of
"call `activate(ctx)` on a module from a static import." Same contract either way.

```
┌─────────────────────────────────────────────────────────────────────┐
│  apps/desktop  (THIN)                                                │
│    main.tsx → boot kernel → load built-in extensions → <Shell/>     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ depends on
┌───────────────────────────────▼─────────────────────────────────────┐
│  @jelly/kernel        registry · command bus · event bus ·          │
│                       lifecycle · slot system · <Shell/>            │
│  @jelly/ui            design system · theme tokens · primitives     │
│  @jelly/ipc           typed Tauri bridge (the privileged channel)   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ all depend ONLY on
┌───────────────────────────────▼─────────────────────────────────────┐
│  @jelly/sdk           the CONTRACT: types + ExtensionContext         │
│                       (depends on nothing — the frozen surface)     │
└──────────────────────────────────────────────────────────────────────┘
                                ▲ each extension depends on sdk/ui/ipc
   @jelly/files · @jelly/editor · @jelly/terminal · @jelly/git · @jelly/settings · @jelly/welcome
```

---

## Monorepo layout

```
jelly/
├── apps/
│   └── desktop/                    # THIN host app
│       ├── src/
│       │   ├── main.tsx            # React entry
│       │   ├── app.tsx             # <KernelProvider><Shell/></KernelProvider>
│       │   └── extensions.ts       # static list of built-in extensions to load
│       ├── src-tauri/              # thin Tauri host: wires core crates + generate_handler
│       ├── index.html
│       └── vite.config.ts
│
├── packages/
│   ├── sdk/        @jelly/sdk      # types + ExtensionContext contract. Depends on nothing.
│   ├── kernel/     @jelly/kernel   # registry, buses, lifecycle, slots, <Shell/>
│   ├── ui/         @jelly/ui       # design system, theme tokens, primitives, icons
│   ├── ipc/        @jelly/ipc      # typed command/event client; implements SDK IpcClient
│   └── extensions/                 # first-party extensions — each its own package
│       ├── files/     @jelly/files
│       ├── editor/    @jelly/editor
│       ├── terminal/  @jelly/terminal
│       ├── git/       @jelly/git
│       ├── search/    @jelly/search
│       ├── settings/  @jelly/settings
│       └── welcome/   @jelly/welcome
│
├── crates/                         # Rust (Cargo workspace) — mirrors the FE split
│   ├── jelly-core/                 # host: AppState, actor supervisor, command router, window registry
│   ├── jelly-protocol/             # shared serde types (DirEntry, GitStatus, events) ≈ @jelly/sdk
│   └── features/
│       ├── fs/         jelly-fs
│       ├── watcher/    jelly-watcher
│       ├── git/        jelly-git
│       ├── search/     jelly-search
│       └── terminal/   jelly-terminal
│
├── docs/
│   ├── architecture.md             # this file
│   ├── extensions.md               # the extension authoring guide
│   └── product.md
├── roadmap.md
├── turbo.json
├── package.json                    # workspaces + turbo scripts (Bun)
└── Cargo.toml                      # [workspace] members = crates/* + apps/desktop/src-tauri
```

### Dependency rule (enforced, not aspirational)

```
sdk  ←  kernel, ui, ipc  ←  extensions (packages/extensions/*)  ←  desktop
```

- `@jelly/sdk` depends on **nothing**. It is the only thing extensions and kernel share.
- Extensions (`packages/extensions/*`, published as `@jelly/<name>` — built-in, but each is
  internally an `Extension`) depend on `sdk` + `ui` + `ipc`. **Never on each other.**
- `desktop` is the only package allowed to import every extension (to register them).
- Cross-extension interaction happens through the **command bus** and **event bus**, by id —
  never by import.

---

## The contract — `@jelly/sdk`

The SDK is the stable surface. It contains **no implementation**, only types and interfaces.
The kernel implements them; extensions consume them. Freezing this is what lets future
runtime add-ons compile against a known target.

```ts
export interface Extension {
  manifest: ExtensionManifest;
  activate(ctx: ExtensionContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

export interface ExtensionManifest {
  id: string;                 // "jelly.files"  (reverse-dns, globally unique)
  name: string;
  version: string;
  contributes?: {             // declarative contributions (statically inspectable)
    commands?: CommandDescriptor[];
    views?: ViewDescriptor[];
    keybindings?: KeybindingDescriptor[];
    settings?: SettingsSchema;
  };
}

export interface ExtensionContext {
  commands:    CommandRegistry;     // register/execute named commands
  ui:          UIRegistry;          // mount React into named slots
  events:      EventBus;            // subscribe/emit cross-cutting events
  ipc:         IpcClient;           // typed, capability-scoped bridge to Rust core
  settings:    SettingsRegistry;    // declare schema + read/write
  keybindings: KeybindingRegistry;  // bind keys → command ids
  storage:     KeyValueStore;       // per-extension persisted state
  log:         Logger;
  subscriptions: Disposable[];      // anything pushed here is auto-disposed on deactivate
}

export interface Disposable { dispose(): void; }
```

### Command registry

Commands decouple *intent* from *implementation* and from *keybindings*. Anything
invocable is a named command (`"files.reveal"`, `"git.commit"`). The activity bar, the
command palette, and keybindings all dispatch by id.

```ts
interface CommandRegistry {
  register(id: string, handler: (...args: unknown[]) => unknown): Disposable;
  execute<T = unknown>(id: string, ...args: unknown[]): Promise<T>;
}
```

### Keybindings

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
  **Keyboard Shortcuts** cheat sheet (and key hints in the command palette) for free,
  and is the foundation for user-customizable keybindings.

```ts
interface KeybindingRegistry {
  bind(key: string, commandId: string): Disposable;
  list(): KeybindingDescriptor[]; // for the cheat sheet / customization UI
}
```

### Palette providers

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

### UI registry & slots

The kernel owns a fixed set of **layout slots**. Extensions mount React nodes into them;
they never know the overall layout. This is what replaces the hardcoded `EditorView`.

```
Slots:
  titlebar            activitybar          statusbar.left / statusbar.right
  sidebar.panel       editor.surface       panel.tab  (terminal area)
  modal               context-menu
```

```ts
interface UIRegistry {
  contributeActivityBarItem(item: ActivityBarItem): Disposable;
  contributeSidebarPanel(panel: SidebarPanel): Disposable;   // shows when its activity item is active
  contributeStatusBarItem(item: StatusBarItem): Disposable;
  contributeEditorSurface(surface: EditorSurface): Disposable; // e.g. code editor, diff view
  contributePanelTab(tab: PanelTab): Disposable;             // e.g. terminal
  mountSlot(slot: SlotId, node: ReactNode, opts?: SlotOpts): Disposable;
}
```

### Event bus

Cross-extension and core→frontend signals, by name. Replaces direct calls between
features (e.g. "a file was saved" → git refreshes its status without git importing files).

```ts
interface EventBus {
  on<T>(event: string, handler: (payload: T) => void): Disposable;
  emit<T>(event: string, payload: T): void;
}
```

Core events emitted by the host bridge (from Rust → kernel → bus):

```
workspace:opened            file:changed_externally     file:saved
git:status_changed          terminal:output             terminal:exit
```

### IPC client — the privileged channel

The single typed surface onto the Rust core. **This is the security boundary.** Trusted
built-in extensions and (future) untrusted runtime add-ons both reach native capability
*only* through here — never by importing `@tauri-apps/api` directly. Keeping all privileged
work behind `ctx.ipc` is what makes the future sandbox real.

```ts
interface IpcClient {
  fs:       { read, save, list, create, createDir, rename, delete };
  git:      { status, diff, stage, unstage, commit };
  terminal: { create, input, resize, close };
  workspace:{ open, recent, removeRecent };
}
```

---

## A built-in extension, end to end

```ts
// packages/extensions/git/src/index.ts
import type { Extension, ExtensionContext } from "@jelly/sdk";
import { GitPanel } from "./GitPanel";

export const gitExtension: Extension = {
  manifest: {
    id: "jelly.git",
    name: "Git",
    version: "1.0.0",
    contributes: {
      commands: [{ id: "git.commit", title: "Commit" }],
      keybindings: [{ command: "git.commit", key: "mod+enter", when: "gitPanelFocused" }],
    },
  },
  activate(ctx: ExtensionContext) {
    ctx.commands.register("git.refresh", () => refreshStatus(ctx));
    ctx.commands.register("git.commit", (msg: string) => ctx.ipc.git.commit(msg));

    ctx.ui.contributeActivityBarItem({ id: "git", icon: "git-branch", order: 20 });
    ctx.ui.contributeSidebarPanel({ id: "git", render: () => <GitPanel ctx={ctx} /> });
    ctx.ui.contributeStatusBarItem({ id: "git.branch", align: "left", render: BranchBadge });

    // React to core events without importing the files extension:
    ctx.subscriptions.push(
      ctx.events.on("file:saved", () => ctx.commands.execute("git.refresh")),
      ctx.events.on("git:status_changed", (s) => setStatus(s)),
    );
  },
};
```

The desktop app just lists it:

```ts
// apps/desktop/src/extensions.ts
import { filesExtension }    from "@jelly/files";
import { editorExtension }   from "@jelly/editor";
import { terminalExtension } from "@jelly/terminal";
import { gitExtension }      from "@jelly/git";
import { searchExtension }   from "@jelly/search";
import { settingsExtension } from "@jelly/settings";
import { welcomeExtension }  from "@jelly/welcome";

export const builtinExtensions = [
  welcomeExtension, filesExtension, editorExtension,
  terminalExtension, gitExtension, searchExtension, settingsExtension,
];
```

---

## Backend — Rust (mirrors the front-end split)

The Rust core stays the **authoritative core** (owns files, git, terminals) and the
actor model is preserved, organized into a Cargo workspace so each feature is a
crate, parallel to its front-end extension.

```
crates/
  jelly-core/        AppState, actor supervisor, command router, WindowRegistry, AppError
  jelly-protocol/    serde types shared across crates AND mirrored by @jelly/sdk
  features/
    fs/        FileManager actor + #[tauri::command] handlers
    watcher/   FileWatcher actor (notify crate)
    git/       GitActor (git2 crate)
    search/    SearchManager — streaming find/replace (grep + ignore crates)
    terminal/  TerminalActor (portable-pty crate)
```

Each feature crate exposes:
1. an **actor** (tokio task + `mpsc` receiver loop), and
2. a `register(builder) -> builder` fn contributing its `#[tauri::command]`s and actor handle.

`apps/desktop/src-tauri/src/lib.rs` becomes thin — it folds each feature's `register`
into the Tauri builder instead of one giant `generate_handler!`:

```rust
let builder = tauri::Builder::default();
let builder = jelly_fs::register(builder);
let builder = jelly_git::register(builder);
let builder = jelly_terminal::register(builder);
// ...
builder.run(tauri::generate_context!())
```

### Trust boundary (why the split matters for the future)

```
Rust core        = trusted kernel. Exposes a FIXED set of capabilities over IPC.
built-in exts    = trusted JS. May add a feature crate for new native capability.
runtime add-ons  = (future) untrusted JS. NO native code. Can only touch ctx capabilities.
```

Because built-in extensions push all privileged work through `ctx.ipc`, a future runtime
add-on is constrained to the same surface — we hand it a sandboxed `ExtensionContext` and
nothing else. No new architecture required; see roadmap Phase 6.

---

## Tooling

- **Bun** workspaces (already in use — `bun.lock`). Root `package.json` declares
  `workspaces: ["apps/*", "packages/*", "packages/extensions/*"]`.
- **Turbo** orchestrates tasks across packages. `turbo.json` pipeline: `build`, `dev`,
  `lint`, `typecheck`, `test`, with `build` depending on `^build` (upstream packages first)
  and caching outputs.
- **Cargo workspace** at the repo root: `members = ["crates/*", "crates/features/*", "apps/desktop/src-tauri"]`.
- TypeScript **project references** so editors and `tsc -b` resolve packages incrementally.

```jsonc
// turbo.json (shape)
{
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "dev":       { "cache": false, "persistent": true },
    "lint":      {},
    "test":      { "dependsOn": ["^build"] }
  }
}
```

---

## Testing

Philosophy: test logic, not plumbing — relocated per package.

- **sdk**: type-level only (no runtime).
- **kernel**: registry/bus/lifecycle unit tests (register → execute → dispose).
- **extensions**: each tests its own pure logic (store transitions, reducers).
- **Rust feature crates**: actor handler logic against real temp dirs / real git repos
  (`git2::Repository::init`), no mocking.

Runner: Vitest (FE), `cargo test` (Rust). Turbo runs `test` across the graph.
