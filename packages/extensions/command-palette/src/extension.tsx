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
      ],
      keybindings: [
        { command: "commandPalette.toggle", key: "mod+k" },
        { command: "commandPalette.openFiles", key: "mod+p" },
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
    );

    ctx.ui.mountSlot("modal", <CommandPalette ctx={ctx} />, {
      id: "command-palette.modal",
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k" && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          useCommandPaletteUi.getState().openCommands();
        } else if (e.key === "p" && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          useCommandPaletteUi.getState().openFiles();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    ctx.subscriptions.push({ dispose: () => window.removeEventListener("keydown", onKey) });
  },
};
