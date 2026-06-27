# Extensions — End to End

## A built-in extension, end to end

```ts
// packages/extensions/git/src/index.ts
import type { Extension, ExtensionContext } from "@jelly/sdk";
import { GitPanel } from "./GitPanel";

export const gitExtension: Extension = {
  manifest: {
    id: "jelly.git",
    name: "Git",
    version: "1.0.0",
    contributes: {
      commands: [{ id: "git.commit", title: "Commit" }],
      keybindings: [{ command: "git.commit", key: "mod+enter", when: "gitPanelFocused" }],
    },
  },
  activate(ctx: ExtensionContext) {
    ctx.commands.register("git.refresh", () => refreshStatus(ctx));
    ctx.commands.register("git.commit", (msg: string) => ctx.ipc.git.commit(msg));

    ctx.ui.contributeActivityBarItem({ id: "git", icon: "git-branch", order: 20 });
    ctx.ui.contributeSidebarPanel({ id: "git", render: () => <GitPanel ctx={ctx} /> });
    ctx.ui.contributeStatusBarItem({ id: "git.branch", align: "left", render: BranchBadge });

    // React to core events without importing the files extension:
    ctx.subscriptions.push(
      ctx.events.on("file:saved", () => ctx.commands.execute("git.refresh")),
      ctx.events.on("git:status_changed", (s) => setStatus(s)),
    );
  },
};
```

---

## Desktop wiring

The desktop app just lists built-in extensions — it does not know their internals:

```ts
// apps/desktop/src/extensions.ts
import { filesExtension }    from "@jelly/files";
import { editorExtension }   from "@jelly/editor";
import { terminalExtension } from "@jelly/terminal";
import { gitExtension }      from "@jelly/git";
import { searchExtension }   from "@jelly/search";
import { settingsExtension } from "@jelly/settings";
import { welcomeExtension }  from "@jelly/welcome";

export const builtinExtensions = [
  welcomeExtension, filesExtension, editorExtension,
  terminalExtension, gitExtension, searchExtension, settingsExtension,
];
```

For a full guide on authoring extensions, see [`docs/extensions.md`](../extensions.md).
