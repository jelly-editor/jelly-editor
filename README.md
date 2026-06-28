<p align="center">
  <img src="apps/www/public/jelly.png" alt="Jelly Editor" width="80" />
</p>

<h2 align="center">Jelly Editor</h2>

<p align="center">
  An editor that gets out of your way.
</p>

---

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/e338f543-0585-4d82-b536-b2ff06b0f020" />


<br/>
<br/>

When your AI tools are already handling builds, tests, linting, and git — you don't need your editor doing all that too. You mostly just need to browse files, inspect the codebase, make a few edits, and get out of the way.

That's what Jelly is.

## Why Jelly

- **Instant.** Opens in a blink. No indexing, no background services, no spin-up.
- **Minimal by design.** Flat, clean interface where color means state, not decoration. Dark and light themes, both first-class.
- **Terminal built in.** Always one keystroke away, connected to your system shell.
- **Git where you work.** See your branch, stage changes, review diffs, and commit — without context switching.
- **One window per project.** Open as many projects as you like; each gets its own independent window.

## Roadmap

Jelly is in active development — pre-v1, rough edges expected. The roadmap is
organized around the path to a stable v1:

- **v0.2 Core Editing** — fast navigation, workspace search, split panes,
  terminal improvements, and daily editing essentials.
- **v0.3 Git Workflow** — staging, committing, pushing, branching, history, and
  conflict-resolution tools.
- **v0.4 Extension Ecosystem** — runtime extension loading, manifest discovery,
  and a sandboxed extension context.
- **v0.5 Quality of Life** — session restore, breadcrumbs, pinned buffers,
  editor polish, and workflow refinements.
- **v1.0 General Release** — stable APIs, app updates, broader platform support,
  and performance polish.

See the full public roadmap at
[jelly-editor.github.io/roadmap](https://jelly-editor.github.io/roadmap).

## Building from source

Jelly is built with [Tauri](https://tauri.app), React, and Rust. To run it
locally you'll need [Bun](https://bun.sh) and the
[Rust toolchain](https://rustup.rs):

```bash
bun install
bun run --filter desktop tauri:dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, dev, and build details, plus
[`docs/architecture/`](./docs/architecture/README.md) for the design and
[`docs/extensions.md`](./docs/extensions.md) to author an extension.

## License

[MIT](./LICENSE)
