# Tooling and Testing

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
