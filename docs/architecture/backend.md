# Backend — Rust (mirrors the front-end split)

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

---

## Trust boundary (why the split matters for the future)

```
Rust core        = trusted kernel. Exposes a FIXED set of capabilities over IPC.
built-in exts    = trusted JS. May add a feature crate for new native capability.
runtime add-ons  = (future) untrusted JS. NO native code. Can only touch ctx capabilities.
```

Because built-in extensions push all privileged work through `ctx.ipc`, a future runtime
add-on is constrained to the same surface — we hand it a sandboxed `ExtensionContext` and
nothing else. No new architecture required; see roadmap Phase 6.

See also [`ipc.md`](./ipc.md) for the front-end side of the IPC boundary.
