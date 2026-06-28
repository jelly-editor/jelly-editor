# IPC Client — The Privileged Channel

The single typed surface onto the Rust core. **This is the security boundary.** Trusted
built-in extensions and (future) untrusted runtime add-ons both reach native capability
*only* through here — never by importing `@tauri-apps/api` directly. Keeping all privileged
work behind `ctx.ipc` is what makes the future sandbox real.

```ts
interface IpcClient {
  fs:          { read, save, list, listFiles, create, createDir, rename, copy, delete };
  clipboard:   { write, read, clear };         // host-held file clipboard, shared across windows
  git:         { status, diff, stage, unstage, commit };
  terminal:    { create, input, resize, close };
  workspace:   { open, recent, removeRecent };
  settings:    { load, save };               // → ~/.jelly/settings.json
  keybindings: { load, save };               // → ~/.jelly/keybindings.json
  updater:     { check, installAndRestart }; // → Tauri signed updater
}
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
