import type { Extension, ExtensionContext, SettingsSchema } from "@jelly/sdk";
import { GearIcon, ThemeIcon } from "./ui/icons";
import { SettingsModal } from "./ui/SettingsModal";
import { useSettingsUi } from "./store";

const SCHEMA: SettingsSchema = {
  "ui.theme": { type: "enum", enum: ["dark", "light"], default: "dark" },
  "editor.fontSize": { type: "number", default: 13 },
  "editor.tabSize": { type: "number", default: 2 },
  "editor.wordWrap": { type: "boolean", default: false },
  "editor.largeFileThreshold": {
    type: "number",
    default: 1_048_576,
    description: "Files larger than this size (in bytes) open without syntax highlighting.",
  },
};

function applyTheme(theme: unknown) {
  // Disable transitions temporarily to prevent flicker on active sidebar items/buttons
  const css = document.createElement("style");
  css.appendChild(
    document.createTextNode(
      `* {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");

  // Force reflow to ensure the styles are applied before transitions are re-enabled
  void document.documentElement.offsetHeight;

  setTimeout(() => {
    if (css.parentNode) {
      css.parentNode.removeChild(css);
    }
  }, 0);
}

export const settingsExtension: Extension = {
  manifest: {
    id: "jelly.settings",
    name: "Settings",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "settings.toggle", title: "Toggle Settings" },
        { id: "ui.toggleTheme", title: "Toggle Theme" },
      ],
      keybindings: [{ command: "settings.toggle", key: "mod+," }],
      settings: SCHEMA,
    },
  },

  activate(ctx: ExtensionContext) {
    ctx.settings.defineSchema(SCHEMA);
    // Apply the persisted/default theme, and keep the DOM in sync on change.
    applyTheme(ctx.settings.get("ui.theme"));
    ctx.subscriptions.push(ctx.settings.onChange("ui.theme", applyTheme));

    ctx.subscriptions.push(
      ctx.commands.register("settings.toggle", () => useSettingsUi.getState().toggle()),
      ctx.commands.register("ui.toggleTheme", () => {
        const cur = ctx.settings.get<string>("ui.theme") ?? "dark";
        ctx.settings.set("ui.theme", cur === "dark" ? "light" : "dark");
      }),
    );

    ctx.ui.contributeActivityBarItem({
      id: "theme",
      align: "bottom",
      order: 90,
      title: "Toggle theme",
      icon: () => <ThemeIcon ctx={ctx} />,
      onSelect: () => void ctx.commands.execute("ui.toggleTheme"),
    });
    ctx.ui.contributeActivityBarItem({
      id: "settings",
      align: "bottom",
      order: 100,
      title: "Settings (⌘,)",
      icon: () => <GearIcon />,
      onSelect: () => useSettingsUi.getState().toggle(),
    });

    ctx.ui.mountSlot("modal", <SettingsModal ctx={ctx} />, { id: "settings.modal" });
  },
};
