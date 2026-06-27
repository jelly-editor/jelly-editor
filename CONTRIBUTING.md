# Contributing to Jelly

Thanks for your interest in Jelly. This guide covers getting set up, running the
app locally, and the layout of the codebase.

## Prerequisites

- [Bun](https://bun.sh) — package manager and JS/TS runtime
- The [Rust toolchain](https://rustup.rs) — for the Tauri backend
- Platform dependencies required by [Tauri v2](https://tauri.app/start/prerequisites/)
  (Xcode command line tools on macOS, WebView2 + build tools on Windows, the
  WebKitGTK/AppIndicator packages on Linux)

## Setup

Clone the repo and install dependencies:

```bash
bun install
```

This installs every workspace package (apps, packages, and extensions) in one
pass.

## Running in development

Launch the desktop app with hot reload:

```bash
bun run --filter desktop tauri:dev
```

This starts the Vite dev server and the Tauri shell together. Changes to the
front-end packages reload live; changes to Rust trigger a backend rebuild.

To run just the web front-end (no native shell):

```bash
bun run --filter desktop dev
```

## Building

Produce a distributable build of the app:

```bash
bun run --filter desktop tauri:build
```

The compiled bundle for your platform lands under
`apps/desktop/src-tauri/target/release/`.

## Useful commands

All run from the repo root and fan out across the workspace via Turbo:

| Command | What it does |
|---|---|
| `bun run build` | Build every package |
| `bun run typecheck` | Type-check all packages |
| `bun run lint` | Lint all packages |
| `bun run test` | Run all tests |
| `cargo build` | Build the Rust crates |
| `cargo test` | Run the Rust tests |

You can scope any front-end task to a single package with
`--filter <package>`, e.g. `bun run --filter @jelly/editor test`.

## Project layout

Jelly is a monorepo. The front-end is a thin host plus a kernel, with every
feature shipped as a self-contained **extension**; the Rust backend mirrors that
split as a Cargo workspace.

```
apps/desktop/        thin host app (boots the kernel, loads extensions)
packages/sdk/        the extension contract (types only)
packages/kernel/     registry, command/event buses, layout slots, <Shell/>
packages/ui/         design system, theme tokens, primitives, icons
packages/ipc/        typed bridge to the Rust backend
packages/extensions/ first-party extensions (files, editor, terminal, git, …)
crates/              Rust workspace (core + per-feature crates)
docs/                architecture and extension authoring guides
```

Before diving in, read [`docs/architecture/`](./docs/architecture/README.md) for the
design and dependency rules, and [`docs/extensions.md`](./docs/extensions.md) to
author an extension.

## Guidelines

- **Respect the dependency graph.** Extensions may import only `sdk`, `ui`, and
  `ipc` — never another extension. Cross-feature interaction goes through the
  command and event buses by id. See `docs/architecture/` for the full rule.
- **Keep the host thin.** Feature code belongs in an extension, not in
  `apps/desktop`.
- **Test logic, not plumbing.** Unit-test pure logic (store transitions,
  reducers) and Rust handlers against real temp dirs / git repos.
- Run `bun run typecheck` and `bun run test` before opening a pull request.
- **Use conventional commit prefixes** for user-facing changes: `fix:` for bug
  fixes, `feat:` for new features, `feat!:` or a `BREAKING CHANGE:` footer for
  breaking changes. These prefixes drive the auto-generated changelog.

## Releasing

Versioning and releases are handled by [release-it](https://github.com/release-it/release-it)
and triggered manually from GitHub Actions. Only the `desktop` app is versioned —
its version is also the auto-update version shown to users.

**The release flow** (automated, CI only):

1. Go to **GitHub → Actions → Release → Run workflow**.
2. Choose the bump type: `patch`, `minor`, or `major`.
3. CI bumps the version in `apps/desktop/package.json`, generates / updates
   `CHANGELOG.md` from conventional commits, commits, and pushes a `v<version>` tag.
4. The tag triggers the **Build** workflow, which compiles, **signs**, and publishes
   the app for macOS, Windows, and Linux to GitHub Releases, along with the
   `latest.json` updater manifest. Installed apps auto-update via Tauri's updater plugin.

Releases require these repository secrets:

| Secret | Purpose |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Updater signing key (from `tauri signer generate`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for that key |
| `RELEASE_TOKEN` | PAT (repo + workflow) so the version tag triggers the build; optional — without it the build workflow must be triggered manually |

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE).
