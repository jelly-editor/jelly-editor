import type { Extension, ExtensionContext } from "@jelly/sdk";
import { disposeSession, TerminalView } from "./ui/TerminalView";
import { useTerminalStore } from "./store";

export const terminalExtension: Extension = {
  manifest: {
    id: "jelly.terminal",
    name: "Terminal",
    version: "1.0.0",
    contributes: {
      commands: [{ id: "terminal.new", title: "New Terminal" }],
      keybindings: [{ command: "terminal.new", key: "ctrl+`" }],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useTerminalStore;
    let counter = 0;

    void Promise.resolve(ctx.commands.execute<string | null>("workspace.getPath"))
      .then((path) => store.getState().setCwd(path ?? null))
      .catch(() => {});

    // Terminals live in the editor grid as `view` panes. We render them through
    // a renderer the editor invokes — no cross-extension import.
    void ctx.commands.execute(
      "editor.registerView",
      "terminal",
      (id: string, opts: { active: boolean }) => <TerminalView ctx={ctx} id={id} active={opts.active} />,
    );

    ctx.subscriptions.push(
      ctx.events.on<{ path: string }>("workspace:opened", ({ path }) => store.getState().setCwd(path)),
      ctx.commands.register("terminal.new", () => {
        const id = crypto.randomUUID();
        void ctx.commands.execute("editor.openView", "terminal", id, `Terminal ${++counter}`, "group-bottom");
      }),
      ctx.events.on<{ viewType: string; viewId: string }>("editor:view_closed", ({ viewType, viewId }) => {
        if (viewType === "terminal") disposeSession(viewId);
      }),
    );
  },
};
