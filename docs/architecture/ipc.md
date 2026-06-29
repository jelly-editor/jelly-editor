# IPC Client — The Privileged Channel

The single typed surface onto the Rust core. **This is the security boundary.** Trusted
built-in extensions and (future) untrusted runtime add-ons both reach native capability
*only* through here — never by importing `@tauri-apps/api` directly. Keeping all privileged
work behind `ctx.ipc` is what makes the future sandbox real.

```ts
interface IpcClient {
  fs:          { read, save, list, listFiles, create, createDir, rename, copy, delete };
  clipboard:   { write, read, clear };         // host-held file clipboard, shared across windows
  drag:        { start, readSession, clearSession, onDrop }; // OS-native cross-window file drag
  git:         { status, diff, stage, unstage, commit };
  terminal:    { create, input, resize, close };
  workspace:   { open, recent, removeRecent };
  settings:    { load, save };               // → ~/.jelly/settings.json
  keybindings: { load, save };               // → ~/.jelly/keybindings.json
  updater:     { check, installAndRestart }; // → Tauri signed updater
  mcp:         { start, stop, status, tools, updateTools }; // local MCP HTTP server
}
```

The MCP client controls Jelly's loopback-only MCP server. It is intentionally
managed through the same IPC boundary as other privileged capabilities: the
frontend can enable/disable the server and choose exposed tools, but the Rust
feature crate owns the socket, transport handling, and native file/state access.
The settings UI reads available tools through `mcp.tools()`, so new backend tool
groups can show up without hardcoding them in the Settings extension.

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
