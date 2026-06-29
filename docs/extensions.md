# Jelly — Extension Authoring Guide

> An **extension** is a self-contained feature that plugs into the Jelly host. The file
> tree, editor, terminal, and git panel are all extensions. They use the same API a future
> third-party add-on will use. This guide is the contract.

For the big picture see [`architecture.md`](./architecture.md). This document is the
practical reference for writing one.

---

## Anatomy

An extension is an object implementing the `Extension` interface from `@jelly/sdk`:

```ts
import type { Extension, ExtensionContext } from "@jelly/sdk";

export const myExtension: Extension = {
  manifest: {
    id: "jelly.myfeature",     // reverse-dns, globally unique, stable forever
    name: "My Feature",
    version: "1.0.0",
    contributes: { /* declarative — see below */ },
  },

  activate(ctx: ExtensionContext) {
    // Wire everything here. Push every Disposable onto ctx.subscriptions.
  },

  deactivate() {
    // Optional. ctx.subscriptions are auto-disposed; only add manual teardown here.
  },
};
```

### Lifecycle

```
load → activate(ctx) → [running] → deactivate() → dispose(ctx.subscriptions)
```

- `activate` runs once when the host loads the extension. Do all registration here.
- Anything you register returns a `Disposable`. **Push it onto `ctx.subscriptions`** and the
  kernel cleans it up automatically — you rarely need `deactivate`.

---

## The two ways to contribute

**1. Declaratively, via `manifest.contributes`** — statically inspectable (the host can
read it without running your code; the future runtime loader needs this).

```ts
contributes: {
  commands:    [{ id: "myfeature.run", title: "Run My Feature" }],
  keybindings: [{ command: "myfeature.run", key: "mod+shift+r" }],
  settings:    { "myfeature.enabled": { type: "boolean", default: true } },
}
```

**2. Imperatively, in `activate(ctx)`** — for anything dynamic (rendering React, reacting
to events). Most UI lives here.

Rule of thumb: declare *what exists* in the manifest; wire *behavior* in `activate`.

---

## `ExtensionContext` reference

### `ctx.commands` — do things by name

Decouples intent from implementation. The activity bar, keybindings, and the future command
palette all dispatch by id, so commands are how features expose behavior to each other.

```ts
ctx.commands.register("myfeature.run", (arg: string) => doThing(arg));
await ctx.commands.execute("git.refresh");          // call another extension's command
```

### `ctx.ui` — mount into slots

You never lay out the window; you mount into named slots the kernel owns.

```ts
ctx.ui.contributeActivityBarItem({ id: "myfeature", icon: "sparkle", order: 30 });
ctx.ui.contributeSidebarPanel({ id: "myfeature", render: () => <MyPanel ctx={ctx} /> });
ctx.ui.contributeStatusBarItem({ id: "myfeature.count", align: "right", render: Badge });
ctx.ui.contributeEditorSurface({ id: "myfeature.view", canOpen: (uri) => uri.endsWith(".xyz"), render: MyView });
ctx.ui.contributePanelTab({ id: "myfeature.panel", title: "My Panel", render: MyPanel });
```

Available slots: `titlebar`, `activitybar`, `sidebar.panel`, `editor.surface`,
`panel.tab`, `statusbar.left`, `statusbar.right`, `modal`, `context-menu`.

### Pane views — hosting your UI in the editor grid

The editor surface is a tiling grid of panes; tabs are either files or
**contributed views**. An extension hosts its own UI in a pane (e.g. the
terminal) through the command bus — never by importing the editor:

```ts
// Register a renderer for your view type, then open instances as panes.
ctx.commands.execute("editor.registerView", "terminal",
  (id, { active }) => <TerminalView id={id} active={active} />);
ctx.commands.execute("editor.openView", "terminal", instanceId, "Terminal 1");
ctx.commands.execute("editor.closeView", "terminal", instanceId);

// The editor emits this when the user closes (or the last drag empties) the tab.
ctx.events.on("editor:view_closed", ({ viewType, viewId }) => dispose(viewId));
```

View panes are dragged, split, and tiled exactly like file tabs. Because a drag
remounts the host React node, keep long-lived state (a PTY, a websocket) outside
the component — see the terminal's persistent-DOM session map.

### `ctx.dialog` — in-app modal dialogs

The themed replacement for native `alert`/`confirm`. The host renders it; you
just await the choice.

```ts
const ok = await ctx.dialog.confirm("Delete file?", { danger: true, confirmLabel: "Delete" });

const choice = await ctx.dialog.show({
  title: "Name already exists",
  message: `"${name}" already exists here.`,
  kind: "warning",
  buttons: [
    { id: "cancel", label: "Cancel" },
    { id: "duplicate", label: "Keep Both" },
    { id: "overwrite", label: "Replace", variant: "danger" },
  ],
});
// → resolves with the chosen button id ("cancel" on Esc/backdrop)
```

### `ctx.events` — react without coupling

Subscribe to core and cross-extension events by name. This is how git refreshes on save
without ever importing the files extension.

```ts
ctx.subscriptions.push(
  ctx.events.on("file:saved", ({ path }) => refresh(path)),
);
ctx.events.emit("myfeature:done", { ok: true });    // other extensions can listen
```

Core events: `workspace:opened`, `file:changed_externally`, `file:saved`,
`git:status_changed`, `terminal:output`, `terminal:exit`, `editor:active_changed`,
`editor:diff_changed`, `editor:view_closed`.

### `ctx.ipc` — the only door to native capability

All file system, git, and terminal access goes through here. **Do not import
`@tauri-apps/api` directly** — that bypasses the boundary that makes the future sandbox
possible, and your extension would not survive becoming a runtime add-on.

```ts
const text = await ctx.ipc.fs.read(path);
await ctx.ipc.fs.save(path, text);
const status = await ctx.ipc.git.status(workspace);
await ctx.ipc.mcp.start(3282, ["list_notes"]);
```

If you need a native capability that doesn't exist yet, add it to the Rust `features/`
crate and to `@jelly/ipc` (built-in extensions may do this; runtime add-ons may not).

### `ctx.settings`, `ctx.storage`, `ctx.keybindings`, `ctx.log`

```ts
const enabled = ctx.settings.get<boolean>("myfeature.enabled");
ctx.subscriptions.push(ctx.settings.onChange("myfeature.enabled", apply));

await ctx.storage.set("lastUsed", Date.now());      // per-extension persisted KV
const n = await ctx.storage.get<number>("lastUsed");

ctx.keybindings.bind("mod+k mod+t", "myfeature.run");
// User overrides (from the Settings → Keybindings tab) layer on top of manifest
// defaults and persist to ~/.jelly/keybindings.json; list()/infos() read the
// effective set. Prefer declaring defaults in the manifest over bind().
ctx.log.info("activated");
```

---

## Rules

1. **Never import another extension.** Communicate via `ctx.commands` / `ctx.events` by id.
2. **All privileged work goes through `ctx.ipc`.** No direct Tauri imports in an extension.
3. **Push every `Disposable` onto `ctx.subscriptions`.** Leak nothing across deactivate.
4. **`manifest.id` is forever.** Other extensions, keybindings, and settings key off it.
5. **Depend only on `@jelly/sdk`, `@jelly/ui`, `@jelly/ipc`** — never another extension package.
6. **Declare statically what can be declared statically** (commands, keybindings, settings)
   so the future loader can inspect you without executing you.

---

## Package scaffold

```
packages/extensions/myfeature/
├── package.json        # name: "@jelly/myfeature", deps: @jelly/sdk, @jelly/ui, @jelly/ipc
├── tsconfig.json       # extends the base config; references sdk/ui/ipc
└── src/
    ├── index.ts        # exports the Extension object
    ├── MyPanel.tsx     # React UI
    └── logic.ts        # pure, unit-tested logic (no ctx, no IPC)
```

```jsonc
// package.json
{
  "name": "@jelly/myfeature",
  "version": "1.0.0",
  "main": "src/index.ts",
  "dependencies": {
    "@jelly/sdk": "workspace:*",
    "@jelly/ui":  "workspace:*",
    "@jelly/ipc": "workspace:*"
  }
}
```

Register it in the host:

```ts
// apps/desktop/src/extensions.ts
import { myExtension } from "@jelly/myfeature";
export const builtinExtensions = [ /* ...existing, */ myExtension ];
```

---

## Looking ahead: runtime add-ons (not yet implemented)

Today extensions are statically imported and fully trusted. The architecture is built so
that *loading* one at runtime is the only thing that changes later — not the API you write
against. A future runtime add-on will:

- ship pure JS/TS (no native crate),
- be discovered from disk via its `manifest`,
- receive a **sandboxed** `ExtensionContext` whose `ctx.ipc` is permission-scoped,
- and be activated with the exact same `activate(ctx)` call.

So if you follow the rules above — especially "everything through `ctx`" — your extension is
already forward-compatible. See roadmap Phase 6.
