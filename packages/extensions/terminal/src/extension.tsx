import type { Extension, ExtensionContext } from "@jelly/sdk";
import { TerminalPane } from "./ui/TerminalPane";
import { useTerminalStore } from "./store";

export const terminalExtension: Extension = {
  manifest: {
    id: "jelly.terminal",
    name: "Terminal",
    version: "1.0.0",
    contributes: {
      commands: [{ id: "terminal.toggle", title: "Toggle Terminal" }],
      keybindings: [{ command: "terminal.toggle", key: "ctrl+`" }],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useTerminalStore;

    // Track the workspace root so new terminals spawn there.
    void Promise.resolve(ctx.commands.execute<string | null>("workspace.getPath"))
      .then((path) => store.getState().setCwd(path ?? null))
      .catch(() => {});
    ctx.subscriptions.push(
      ctx.events.on<{ path: string }>("workspace:opened", ({ path }) =>
        store.getState().setCwd(path),
      ),
      ctx.commands.register("terminal.toggle", () => store.getState().toggleVisible()),
    );

    ctx.ui.mountSlot("panel.tab", <TerminalPane ctx={ctx} />, { id: "terminal.panel" });

    // Ctrl+` toggles the terminal. Cmd+` is left to macOS for window cycling.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`" && e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        store.getState().toggleVisible();
      }
    };
    window.addEventListener("keydown", onKey);
    ctx.subscriptions.push({ dispose: () => window.removeEventListener("keydown", onKey) });
  },
};
