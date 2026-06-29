# MCP Server

Jelly can run a local MCP server so external agents can call selected Jelly
tools. The server is loopback-only and controlled from Settings -> MCP.

Default endpoint:

```text
http://localhost:3282/mcp
```

The server uses JSON-RPC over HTTP POST and implements:

- `initialize`
- `notifications/initialized`
- `ping`
- `tools/list`
- `tools/call`

## User Flow

1. Open Settings -> MCP.
2. Enable the MCP server.
3. Pick the port if `3282` is already in use.
4. Select which tools are exposed.
5. Copy the connection URL into an MCP client.

The settings UI polls `ctx.ipc.mcp.status()` and shows bind/runtime errors. It
loads available tool metadata from `ctx.ipc.mcp.tools()`, so new backend tool
groups do not need to be hardcoded in the Settings extension.

## Client Setup

Claude Code can be pointed at the local Jelly server with:

```sh
claude mcp add --transport http "Jelly" http://localhost:3282/mcp
```

Codex registers stdio MCP servers. For Jelly's HTTP endpoint, use `mcp-remote`
as the stdio bridge:

```sh
codex mcp add Jelly -- npx -y mcp-remote http://localhost:3282/mcp --allow-http --transport http-only
```

If the MCP port is changed in Settings, replace `3282` with the selected port:

```sh
claude mcp add --transport http "Jelly" http://localhost:<port>/mcp
codex mcp add Jelly -- npx -y mcp-remote http://localhost:<port>/mcp --allow-http --transport http-only
```

## Architecture

Frontend pieces:

- `packages/extensions/mcp/` defines MCP settings and start/stop commands.
- `packages/extensions/settings/src/ui/tabs/MCPTab.tsx` renders the controls.
- `packages/ipc/src/client/mcp.ts` implements the typed IPC client.
- `packages/sdk/src/ipc/clients.ts` defines `McpClient`, `McpStatus`, and
  `McpToolInfo`.

Backend pieces:

- `crates/features/mcp/src/commands.rs` owns Tauri commands and server state.
- `crates/features/mcp/src/server.rs` owns the HTTP/MCP transport.
- `crates/features/mcp/src/tools/mod.rs` aggregates tool groups.
- `crates/features/mcp/src/tools/notes.rs` implements the Notes tool group.

Desktop wiring:

- `apps/desktop/src/extensions.ts` loads `mcpExtension`.
- `apps/desktop/src-tauri/src/lib.rs` registers `jelly_mcp` and exposes the MCP
  Tauri commands.

## Runtime Behavior

`mcp_start(port, allowedTools)` binds `127.0.0.1:<port>` before reporting
success. If the bind fails, the error is saved in MCP status and shown in
Settings.

`mcp_status()` returns:

```ts
{
  running: boolean;
  port: number | null;
  error?: string | null;
}
```

The server state tracks a generation id so a stopped previous server cannot
clear the status of a newer restarted server.

## Live Editor Updates

Notes tools are scoped by an explicit `cwd` argument. Agents must pass `cwd` as
the absolute folder path they want to operate on.

MCP tools that edit file contents must emit the same core events as native
features. Notes currently do this:

- `notes:changed` includes the affected folder and note paths. The Notes
  extension reloads the fresh native state for that folder and updates its
  frontend storage cache.
- `file:changed_externally` tells the editor that an open buffer changed on
  disk.

That means when an agent updates a note or todo through MCP:

- if the file is open and clean, the editor reloads it automatically;
- if the file is open with unsaved edits, the editor shows the existing
  changed-on-disk notification and lets the user reload or keep their version.

This matters because Jelly notes are stored under `~/.jelly/notes`, outside the
folder watcher, and because extension storage is cached in the frontend. MCP
tools must emit the event themselves after writes so the notes list and editor
buffers update immediately.

## Security Model

The server binds only to `127.0.0.1`.

Browser-origin requests are rejected unless the `Origin` is local:

- no `Origin` header is allowed for non-browser MCP clients;
- `localhost`, `127.0.0.1`, `[::1]`, `null`, and `tauri://...` are allowed;
- remote origins are rejected.

Tool access is allowlisted by the user. `tools/list` only returns enabled tools,
and `tools/call` rejects disabled tools.

Notes tools only read/update/delete notes that are indexed by Jelly state. They
do not accept arbitrary filesystem paths for existing-note operations.

## Adding Tools

Add a new tool group under `crates/features/mcp/src/tools/`.

Recommended shape:

```rust
pub fn infos() -> Vec<ToolInfo> {
    vec![ToolInfo {
        name: "example_tool",
        label: "Example tool",
        description: "Short user-facing description",
        group: "Example",
    }]
}

pub fn definitions() -> Vec<Value> {
    vec![json!({
        "name": "example_tool",
        "description": "Detailed MCP-facing description.",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "additionalProperties": false
        }
    })]
}

pub fn has_tool(name: &str) -> bool {
    name == "example_tool"
}

pub async fn call(name: &str, args: Value, app: &AppHandle) -> ToolOutput {
    match name {
        "example_tool" => ToolOutput::ok("done"),
        _ => ToolOutput::error(format!("Unknown example tool: {name}")),
    }
}
```

Then register it in `tools/mod.rs` by extending:

- `all_tools()`
- `tool_infos()`
- `call_tool()`

If the tool writes files, emit `file:changed_externally`. If it changes
extension state, emit a feature-specific event and have the extension reload
through the event bus.

## Validation

Run these before finishing MCP changes:

```sh
bun run typecheck
bun run test
cargo test
bun run --filter desktop build
```
