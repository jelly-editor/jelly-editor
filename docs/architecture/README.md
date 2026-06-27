# Jelly — Architecture

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
│   ├── architecture/               # this folder
│   │   ├── README.md               # overview + monorepo layout (this file)
│   │   ├── sdk.md                  # @jelly/sdk contract
│   │   ├── command-system.md       # command registry, keybindings, palette providers
│   │   ├── ui-slots.md             # UI registry, layout slots, event bus
│   │   ├── ipc.md                  # IPC client + trust boundary
│   │   ├── extensions.md           # end-to-end extension example
│   │   ├── backend.md              # Rust crate architecture + actor model
│   │   └── tooling-and-testing.md  # Bun/Turbo/Cargo tooling + testing philosophy
│   ├── extensions.md               # extension authoring guide
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

## Section index

| Document | Contents |
|---|---|
| [sdk.md](./sdk.md) | `@jelly/sdk` contract — `Extension`, `ExtensionManifest`, `ExtensionContext` |
| [command-system.md](./command-system.md) | Command registry, keybindings, palette providers |
| [ui-slots.md](./ui-slots.md) | UI registry, layout slots, event bus |
| [ipc.md](./ipc.md) | IPC client, trust boundary, security model |
| [extensions.md](./extensions.md) | End-to-end extension example + desktop wiring |
| [backend.md](./backend.md) | Rust crate architecture, actor model, Tauri builder |
| [tooling-and-testing.md](./tooling-and-testing.md) | Bun/Turbo/Cargo tooling, testing philosophy |
