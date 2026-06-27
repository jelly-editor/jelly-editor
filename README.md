<p align="center">
  <img src="apps/www/public/jelly.png" alt="Drivebase" width="80" />
</p>

<h2 align="center">Jelly Editor</h2>

<p align="center">
  An editor that gets out of your way.
</p>

---

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/5070920b-8ba9-4a60-8554-f65dc551bdd2" />

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

## Features

- **Editor** — syntax highlighting for common languages, file tabs with unsaved indicators, multi-cursor, find & replace with regex, word wrap.
- **File explorer** — browse your folder with file-type icons; create, rename, and delete files and folders.
- **Integrated terminal** — full terminal with multiple tabs, resizable alongside your code.
- **Git panel** — view changed files, stage and unstage, inspect diffs, and commit with a message.
- **Settings** — adjust font, font size, tab size, word wrap, and theme.

## Roadmap

Jelly is in active development — pre-v1, rough edges expected.

Track what's planned, in progress, and shipped on the [public project board](https://github.com/orgs/jelly-editor/projects).

## Building from source

Jelly is built with [Tauri](https://tauri.app), React, and Rust. To run it
locally you'll need [Bun](https://bun.sh) and the
[Rust toolchain](https://rustup.rs):

```bash
bun install
bun run --filter desktop tauri:dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, dev, and build details, plus
[`docs/architecture.md`](./docs/architecture.md) for the design and
[`docs/extensions.md`](./docs/extensions.md) to author an extension.

## License

[MIT](./LICENSE)
