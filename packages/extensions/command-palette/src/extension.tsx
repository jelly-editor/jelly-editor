import type { ExtensionContext, Extension, PaletteItem } from "@jelly/sdk";
import { formatKeybinding, fuzzyMatch } from "@jelly/ui";
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
        { command: "commandPalette.toggle", key: "mod+shift+p" },
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

      // All palette-visible commands, with their keybinding shown as a hint.
      ctx.palette.registerProvider({
        id: "commands",
        prefix: ">",
        placeholder: "Type a command…",
        getItems: (q): PaletteItem[] =>
          ctx.commands
            .list()
            .filter((c) => c.palette !== false)
            .filter((c) => fuzzyMatch(q, c.title) || fuzzyMatch(q, c.category ?? ""))
            .map((c) => ({
              id: c.id,
              // Prefix with the source, e.g. "Git: Commit". No id/shortcut hint.
              label: c.category ? `${c.category}: ${c.title}` : c.title,
              onAccept: () => void ctx.commands.execute(c.id).catch(() => {}),
            })),
      }),

      // Every keybinding, joined to its command's title — the cheat sheet.
      ctx.palette.registerProvider({
        id: "shortcuts",
        prefix: "?",
        placeholder: "Search keyboard shortcuts…",
        getItems: (q): PaletteItem[] => {
          const titleFor = new Map(ctx.commands.list().map((c) => [c.id, c.title]));
          return ctx.keybindings
            .list()
            .filter((b) => fuzzyMatch(q, titleFor.get(b.command) ?? b.command) || fuzzyMatch(q, b.key))
            .map((b) => ({
              id: `${b.command}:${b.key}`,
              label: titleFor.get(b.command) ?? b.command,
              hint: formatKeybinding(b.key),
              onAccept: () => void ctx.commands.execute(b.command).catch(() => {}),
            }));
        },
      }),
    );

    ctx.ui.mountSlot("modal", <CommandPalette ctx={ctx} />, {
      id: "command-palette.modal",
    });
  },
};
