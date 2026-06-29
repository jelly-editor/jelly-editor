import type { Extension, ExtensionContext } from "@jelly/sdk";
import { scheduleDisposeSession, setTerminalCwd, TerminalView } from "./ui/TerminalView";
import { useTerminalStore } from "./store";

export const terminalExtension: Extension = {
  manifest: {
    id: "jelly.terminal",
    name: "Terminal",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "terminal.new", title: "New Terminal" },
        { id: "terminal.toggle", title: "Toggle Terminal" },
        { id: "terminal.openAt", title: "Open in Terminal", palette: false },
      ],
      keybindings: [
        { command: "terminal.new", key: "ctrl+`" },
        { command: "terminal.toggle", key: "mod+j" },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useTerminalStore;
    let counter = 0;
    const openTerminal = (cwd?: string) => {
      const id = crypto.randomUUID();
      if (cwd) setTerminalCwd(id, cwd);
      void ctx.commands.execute("editor.openView", "terminal", id, `Terminal ${++counter}`, "group-bottom");
    };

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
      ctx.commands.register("terminal.new", () => openTerminal()),
      ctx.commands.register("terminal.openAt", (path: string) => openTerminal(path)),
      ctx.commands.register("terminal.toggle", async () => {
        const toggled = await ctx.commands.execute<boolean>("editor.toggleViewType", "terminal");
        if (!toggled) openTerminal();
      }),
      ctx.events.on<{ viewType: string; viewId: string }>("editor:view_closed", ({ viewType, viewId }) => {
        // Use a grace window instead of immediate disposal: if the layout is
        // restored quickly (folder switch), the TerminalView remounts and
        // cancels the timer. If the tab is genuinely user-closed and never
        // remounted, the PTY is killed after ORPHAN_TTL.
        if (viewType === "terminal") scheduleDisposeSession(viewId);
      }),
    );
  },
};
