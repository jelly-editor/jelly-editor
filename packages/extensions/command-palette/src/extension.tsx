import type { Extension, ExtensionContext } from "@jelly/sdk";
import { CommandPalette } from "./ui/CommandPalette";
import { useCommandPaletteUi } from "./store";

export const commandPaletteExtension: Extension = {
  manifest: {
    id: "jelly.command-palette",
    name: "Command Palette",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "commandPalette.toggle", title: "Show All Commands" },
        { id: "commandPalette.openFiles", title: "Go to File", palette: false },
        { id: "commandPalette.shortcuts", title: "Keyboard Shortcuts" },
      ],
      keybindings: [
        { command: "commandPalette.toggle", key: "mod+k" },
        { command: "commandPalette.openFiles", key: "mod+p" },
        { command: "commandPalette.shortcuts", key: "mod+k mod+s" },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    ctx.subscriptions.push(
      ctx.commands.register("commandPalette.toggle", () =>
        useCommandPaletteUi.getState().openCommands(),
      ),
      ctx.commands.register("commandPalette.openFiles", () =>
        useCommandPaletteUi.getState().openFiles(),
      ),
      ctx.commands.register("commandPalette.shortcuts", () =>
        useCommandPaletteUi.getState().openShortcuts(),
      ),
    );

    ctx.ui.mountSlot("modal", <CommandPalette ctx={ctx} />, {
      id: "command-palette.modal",
    });
  },
};
