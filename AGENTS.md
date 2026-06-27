# AGENTS.md

Orientation for AI agents working in this repo. Keep changes small and aligned
with the architecture below.

## What Jelly is

A fast, minimal desktop code editor built with Tauri v2, React, and Rust. The
app shell is a thin **host** that boots a **kernel** (registry + command/event
buses + layout slots); every feature — files, editor, terminal, git, settings —
is a self-contained **extension** that mounts into the kernel.

## Structure

```
apps/desktop/        thin host (boots kernel, loads extensions) — no feature code
packages/sdk/        the extension contract (types only, depends on nothing)
packages/kernel/     registry, command/event buses, layout slots, <Shell/>
packages/ui/         design system, theme tokens, primitives, icons
packages/ipc/        the ONLY module that talks to @tauri-apps/api
packages/extensions/ first-party extensions (files, editor, terminal, git, search, settings, welcome)
crates/              Rust workspace: jelly-core, jelly-protocol, crates/features/{fs,watcher,git,search,terminal}
docs/                architecture.md, extensions.md, product.md
```

## Architecture rules (do not break)

```
sdk  ←  kernel, ui, ipc  ←  extensions  ←  desktop
```

- **No extension imports another extension.** Cross-feature interaction goes
  through the command bus and event bus, by id — never by import.
- Extensions may import only `@jelly/sdk`, `@jelly/ui`, `@jelly/ipc`.
- Only `@jelly/ipc` imports `@tauri-apps/api`. Native calls go through `ctx.ipc`.
- Keep `apps/desktop` thin — feature code belongs in an extension.
- The Rust backend mirrors the FE split: one crate per feature, each an actor
  with a `register(builder)` fn.

## Commands

| Command | Purpose |
|---|---|
| `bun install` | Install all workspace deps |
| `bun run --filter desktop tauri:dev` | Run the app with hot reload |
| `bun run --filter desktop tauri:build` | Build a distributable |
| `bun run build` / `typecheck` / `lint` / `test` | Workspace-wide via Turbo |
| `cargo build` / `cargo test` | Rust crates |
| `bun run release:ci` | Bump version, generate changelog, tag, push (CI only) |

Scope any FE task to a package with `--filter <package>` (e.g.
`bun run --filter @jelly/editor test`).

## Conventions

- Split files by concern; `index.ts` re-exports only, folders group related code.
- **Releases:** Managed by `release-it`. Trigger from **GitHub Actions → Release
  → Run workflow**, pick `patch` / `minor` / `major`. CI bumps `apps/desktop/package.json`,
  writes `CHANGELOG.md`, commits, and pushes a `v<version>` tag. The build workflow
  then compiles, signs, and publishes to GitHub Releases with a Tauri `latest.json`
  updater manifest. Use conventional commit prefixes (`fix:`, `feat:`, `feat!:`) so
  the changelog is meaningful.
- Test pure logic (store transitions, reducers) and Rust handlers against real
  temp dirs / git repos — not plumbing.
- Run `bun run typecheck` and `bun run test` before finishing a change.
- **Keep docs in sync.** When you change the architecture, dependency rules,
  structure, commands, or the extension API, update the relevant docs in the
  same change — `docs/architecture.md`, `docs/extensions.md`, this file, and
  `CONTRIBUTING.md` / `README.md` where applicable.

## Read first

- [`docs/architecture.md`](./docs/architecture.md) — full design + dependency rules
- [`docs/extensions.md`](./docs/extensions.md) — extension authoring guide
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — setup, dev, build
