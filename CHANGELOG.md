# Changelog

## [0.1.9](https://github.com/jelly-editor/jelly-editor/compare/v0.1.8...v0.1.9) (2026-06-29)

### Features

* folder switcher in titlebar with context menu and dropdown outside-click fix ([b838774](https://github.com/jelly-editor/jelly-editor/commit/b83877459bbdb9c3a9a693d244609555f7808b5f))
* **menu:** add 'Add Folder to Workspace' to File menu ([6d016ab](https://github.com/jelly-editor/jelly-editor/commit/6d016abf60f52af3381214aa36b86d624c2e306e))
* multi-folder workspaces with folder switcher and welcome screen tabs ([4c268c1](https://github.com/jelly-editor/jelly-editor/commit/4c268c154b36d58df4063baaa55a8d57c9f24ff4))
* **terminal:** add + button to terminal panel and fix file target for empty pane ([11d69e2](https://github.com/jelly-editor/jelly-editor/commit/11d69e294fd22a595f612145d443fc0b59f14336))
* **workspace-title:** show recent folders and fix chevron alignment ([dddc8e3](https://github.com/jelly-editor/jelly-editor/commit/dddc8e3e916a11e4e7f9c788575272c2ea1791e2))

### Bug Fixes

* prevent editor text selection during file/tab drag ([54610c5](https://github.com/jelly-editor/jelly-editor/commit/54610c5094e97907ce84b75edcb57f7f6c5b6b2d))
* **terminal:** preserve PTY sessions across folder switches ([1aca56b](https://github.com/jelly-editor/jelly-editor/commit/1aca56b639bb36a5c77f7134740734daf8dffb63))
* **workspace:** preserve terminal sessions on folder switch ([d919b28](https://github.com/jelly-editor/jelly-editor/commit/d919b2829550dc011d66ad526467cd5b6ee2690b))

### Reverts

* Revert "fix(workspace): preserve terminal sessions on folder switch" ([371423f](https://github.com/jelly-editor/jelly-editor/commit/371423fd26cf8a373f4aad83594b08dd91efa12e))

## [0.1.8](https://github.com/jelly-editor/jelly-editor/compare/v0.1.7...v0.1.8) (2026-06-29)

## [0.1.7](https://github.com/jelly-editor/jelly-editor/compare/v0.1.6...v0.1.7) (2026-06-29)

## [0.1.6](https://github.com/jelly-editor/jelly-editor/compare/v0.1.5...v0.1.6) (2026-06-29)

### Features

* add games hub and typing test mini game extension ([d84e631](https://github.com/jelly-editor/jelly-editor/commit/d84e631f0fd1385ee236ddb4dce990ba055b58e0))

## [0.1.5](https://github.com/jelly-editor/jelly-editor/compare/v0.1.4...v0.1.5) (2026-06-28)

### Features

* add changelog route to apps/www loading from github releases ([c35a837](https://github.com/jelly-editor/jelly-editor/commit/c35a8376b31313bca3efa425885dbdae87e2160b))
* add native app menus ([4812d9d](https://github.com/jelly-editor/jelly-editor/commit/4812d9dbee469bf6e5c0ccab8ccf575f7f8a4e23))
* **files:** add Reveal in Finder and Open in Terminal context menu actions ([e0438ac](https://github.com/jelly-editor/jelly-editor/commit/e0438ac0b6820c980d4fef102ee206828aed9778))
* **files:** cross-window copy/cut/paste via host-held file clipboard ([f984735](https://github.com/jelly-editor/jelly-editor/commit/f984735aba0ef889b77cd97900a17f29f08096c2))
* **files:** cross-window drag-and-drop via OS-native drag, Opt to copy ([6e87ae0](https://github.com/jelly-editor/jelly-editor/commit/6e87ae0e9df4b1331c395fb929b240ba51dcfc06))
* **files:** multi-selection with Cmd-click for copy/paste, drag-and-drop, and delete ([6d9762a](https://github.com/jelly-editor/jelly-editor/commit/6d9762ab92d3194271c91b99bb8e527e96f80df4))
* **git:** show change count badge on activity bar icon ([cb01dac](https://github.com/jelly-editor/jelly-editor/commit/cb01dac807022e9e564be9e9dde2f7ef974b997d))
* increase changelog max to 20 and show older updates callout conditionally ([62bd786](https://github.com/jelly-editor/jelly-editor/commit/62bd786e70c0870709536077d56370d8e8f6a5a7))
* **terminal:** add left gutter spacing ([fa2adcd](https://github.com/jelly-editor/jelly-editor/commit/fa2adcd86cfdb5d072cb365a0d2291fb0f10cbe1))

### Bug Fixes

* **editor:** hide git change gutter for untracked files ([dd65c79](https://github.com/jelly-editor/jelly-editor/commit/dd65c79d261c71c45f2d2a23f56487fae4da7ee8))
* **files:** pointer-driven tree drag for snappy in-window DnD, fixed line-number gutter width ([154f093](https://github.com/jelly-editor/jelly-editor/commit/154f093421d4a4d962ca6386e04cb159affecdfa))
* **files:** read drag copy intent from dropEffect so Opt copies in WKWebView ([6d221ed](https://github.com/jelly-editor/jelly-editor/commit/6d221ed7fbb91893d70a2eadc759bda070fc95ae))
* **github:** resolve YAML syntax error in bug report template ([782e889](https://github.com/jelly-editor/jelly-editor/commit/782e88901d40ec4bdfd6e67982a9cda7c13d2815))
* improve terminal panel behavior ([d99d8e3](https://github.com/jelly-editor/jelly-editor/commit/d99d8e38d0a6ed368574191e3bd646ab8b3e4d6d))
* pane drag detection ([21d2079](https://github.com/jelly-editor/jelly-editor/commit/21d20793f4660fb2f8de19ba90140f4c2bcf9e8b))
* stabilize file drag and drop ([98abe80](https://github.com/jelly-editor/jelly-editor/commit/98abe80a1fd5af94a6a51c4f908fb156d8e1b081))

* chore: fix version (5bf9d69)
* fix: improve terminal panel behavior (d99d8e3)
* chore: add github issue templates (d59b893)
* feat: increase changelog max to 20 and show older updates callout conditionally (62bd786)
* feat: add changelog route to apps/www loading from github releases (c35a837)
* feat: add native app menus (4812d9d)
* ci: use latest changelog entry as release body (d9feb28)

## [0.1.4](https://github.com/jelly-editor/jelly-editor/compare/v0.1.3...v0.1.4) (2026-06-28)

### Features

* add manual update checker ([adf9f36](https://github.com/jelly-editor/jelly-editor/commit/adf9f36598357504d717f7542c23dbf713aeaafd))
* **command-palette:** group commands by source, drop id/shortcut hints ([21c9f2b](https://github.com/jelly-editor/jelly-editor/commit/21c9f2b39972ddb620280b51409e6ea41dad4486))
* **editor:** auto-reload unedited files changed on disk, notify when dirty ([fef3cc2](https://github.com/jelly-editor/jelly-editor/commit/fef3cc2c4148132730a1ad21cfdd3f060492471c))
* **editor:** code folding with fold/unfold keybindings ([5c00c35](https://github.com/jelly-editor/jelly-editor/commit/5c00c35e234ad01ddb7a7dae40f926d4159a737d)), closes [#8](https://github.com/jelly-editor/jelly-editor/issues/8)
* **editor:** git change gutter for modified lines ([6241168](https://github.com/jelly-editor/jelly-editor/commit/62411680cccba41e0e63b084386fb7158db8801a))
* **editor:** persist unsaved buffer content across sessions ([06f8b5e](https://github.com/jelly-editor/jelly-editor/commit/06f8b5ef15fd8ce9089c73680ac444994d81c63a))
* **editor:** tiling split panes, draggable tabs, terminals as panes ([9bf778f](https://github.com/jelly-editor/jelly-editor/commit/9bf778f1e3b0ef22a03fd861fe2e924cd6fa2c31))
* **files:** colour tree entries by git status ([ad9e982](https://github.com/jelly-editor/jelly-editor/commit/ad9e9823ead4b4e0593eac7d8e18fae370943e19))
* **files:** recursive "Go to File" index across the whole workspace ([6bae44c](https://github.com/jelly-editor/jelly-editor/commit/6bae44cc14f3af6ade7b1766289b5743ddf0e891))
* **files:** reveal active file in the explorer tree ([1b207bf](https://github.com/jelly-editor/jelly-editor/commit/1b207bf1e2d7aa0027434524cb1a69b08620f0e9))
* **git:** discard changes button on unstaged files ([b4fb041](https://github.com/jelly-editor/jelly-editor/commit/b4fb041f4b1d5bb7fac4eab05c0832eee86e2a90))
* **git:** refresh panel on external stage/commit/branch changes ([99aa2d6](https://github.com/jelly-editor/jelly-editor/commit/99aa2d66d5a869db124feb62096b7a7641e8095e))
* persist expanded folders and open tabs across sessions ([84f070d](https://github.com/jelly-editor/jelly-editor/commit/84f070d86e3357ef08fbc5e6eb1f213f285eae0b))
* **www:** add open graph and twitter meta tags ([d63ea0f](https://github.com/jelly-editor/jelly-editor/commit/d63ea0f5927a1abad1667289d75fc347b90e9d0f))

### Bug Fixes

* **watcher:** watch dirs individually, skip ignored trees ([d628ea8](https://github.com/jelly-editor/jelly-editor/commit/d628ea889279ea0d593793d374f53c192bead95b))

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
