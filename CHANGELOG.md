# Changelog

## [0.1.3](https://github.com/jelly-editor/jelly-editor/compare/v0.1.2...v0.1.3) (2026-06-27)

### Features

* add 'jelly .' CLI with single-instance focus and opt-in PATH installer ([03649c8](https://github.com/jelly-editor/jelly-editor/commit/03649c83396ee629b2a8532e0dccf58a2159c036))
* command palette (⌘K) and file picker (⌘P) ([#45](https://github.com/jelly-editor/jelly-editor/issues/45)) ([febfa4a](https://github.com/jelly-editor/jelly-editor/commit/febfa4a6f18f9ee44556a0559b558c3bf8b6d7ff))
* **editor:** disable syntax highlighting for large files with warning banner ([e7ceeb3](https://github.com/jelly-editor/jelly-editor/commit/e7ceeb3fdf83eb2905933faf1139997619e0e665))
* **editor:** replace default CM search panel with custom find/replace UI ([02be77e](https://github.com/jelly-editor/jelly-editor/commit/02be77e0d3c221aa0e966ef75d9a839b1f2f521e))
* **files:** drag-and-drop move/copy + in-app dialog API ([#47](https://github.com/jelly-editor/jelly-editor/issues/47)) ([f4840a9](https://github.com/jelly-editor/jelly-editor/commit/f4840a9e218429ab991dcabd91f664b115266c7c)), closes [#23](https://github.com/jelly-editor/jelly-editor/issues/23)
* **files:** rename focused file on Enter in explorer ([1d2153a](https://github.com/jelly-editor/jelly-editor/commit/1d2153a28255686bd7c18cc7d2ee2db5469e49a9))
* **git:** file icon ([734decb](https://github.com/jelly-editor/jelly-editor/commit/734decb3a23180ff371eca1d518ab80cd11f7dbf))
* **git:** warn on heavy untracked dirs, offer .gitignore fix ([5f1e881](https://github.com/jelly-editor/jelly-editor/commit/5f1e881b387e6410e94159f016a2526fc93cebf3))
* **kernel:** centralized keybinding system + shortcuts cheat sheet ([690b67a](https://github.com/jelly-editor/jelly-editor/commit/690b67a6fda97613e56e48199c556d95fd051b9b))
* **keybindings:** user-customizable keybindings UI ([#46](https://github.com/jelly-editor/jelly-editor/issues/46)) ([7c3bc09](https://github.com/jelly-editor/jelly-editor/commit/7c3bc09c01b08d6f86b6a97ae45c7b233fc2bfc8)), closes [#21](https://github.com/jelly-editor/jelly-editor/issues/21)
* **notifications:** add notification API and bottom-right toast host ([cbf06d8](https://github.com/jelly-editor/jelly-editor/commit/cbf06d889a142739b866d4f3c59059f8b2b48e5b))
* persist settings and recent folders to ~/.jelly ([3129272](https://github.com/jelly-editor/jelly-editor/commit/31292721cadfaa2724992d9af455f8a880fc4bde))
* **search:** find in files across workspace (⌘⇧F) ([5735efd](https://github.com/jelly-editor/jelly-editor/commit/5735efd108818b88519bd7f89b1c1d84bbc5eeca)), closes [#6](https://github.com/jelly-editor/jelly-editor/issues/6)
* **search:** replace in files ([930605c](https://github.com/jelly-editor/jelly-editor/commit/930605c58683d7edaa489682050a784c46a348a8))
* **ui:** disable text selection globally, show logo on welcome screen ([d6f5cc1](https://github.com/jelly-editor/jelly-editor/commit/d6f5cc134cdcd079681d681b1b94c299d6d9ecf1))

### Bug Fixes

* automatically close diff view when opening a file ([9b348cb](https://github.com/jelly-editor/jelly-editor/commit/9b348cb57cb8774ec0a3468e29b45199b0035786))
* disable transitions temporarily during theme switch ([402d1e6](https://github.com/jelly-editor/jelly-editor/commit/402d1e66cb1a3a79e8e407dce9a24bfdadb1aaf7))
* **files:** rename input not showing for top-level files ([f4c4b31](https://github.com/jelly-editor/jelly-editor/commit/f4c4b3119687f7ce1e025336e3560c8bc8b484d3))
* **git:** keep filename visible, widen path, brighten dir text ([214309e](https://github.com/jelly-editor/jelly-editor/commit/214309e21b7bd1efadd9c05dca229f553d0605c1))
* **notifications:** keep toast actions on one row ([6d94e20](https://github.com/jelly-editor/jelly-editor/commit/6d94e2082639c628f823c20cfc53d205590f2485))
* **palette:** reset query when a command switches the active provider ([07b39a0](https://github.com/jelly-editor/jelly-editor/commit/07b39a0c1b9b62299a787122dc420f2a60a49680))
* **ui:** change accent color from orange to purple ([1c6a3f8](https://github.com/jelly-editor/jelly-editor/commit/1c6a3f8609bb893fe06bd037873590df9bbfb39c))
* **ui:** improve dark mode text contrast ([4d68ed9](https://github.com/jelly-editor/jelly-editor/commit/4d68ed90a98e3fdfbf41155f7019f2d4c1f7ba29))

## [0.1.2](https://github.com/jelly-editor/jelly-editor/compare/v0.1.1...v0.1.2) (2026-06-26)

### Features

* link downloads to latest github release, add repo links and dynamic versioning ([b3f7a95](https://github.com/jelly-editor/jelly-editor/commit/b3f7a95e947ea97ffbc0f0f336bafa2695581fa5))

### Bug Fixes

* add .nojekyll to bypass Jekyll on GitHub Pages ([080a1c2](https://github.com/jelly-editor/jelly-editor/commit/080a1c2bc9c9006e54821150d10f714a87bbd476))
* load macOS interactive shell environment on startup to resolve PATH issues ([c9e5b40](https://github.com/jelly-editor/jelly-editor/commit/c9e5b404d49147c3f3cc5a252123f8dc9c118e32))

## [0.1.1](https://github.com/jelly-editor/jelly-editor/compare/v0.1.0...v0.1.1) (2026-06-26)
