import type { Extension, ExtensionContext } from "@jelly/sdk";
import { openEditorWindow } from "@jelly/ipc";
import { WelcomeView } from "./ui/WelcomeView";

export const welcomeExtension: Extension = {
  manifest: {
    id: "jelly.welcome",
    name: "Welcome",
    version: "1.0.0",
    contributes: {
      commands: [{ id: "window.new", title: "New Window" }],
      keybindings: [{ command: "window.new", key: "mod+shift+n" }],
    },
  },

  activate(ctx: ExtensionContext) {
    ctx.subscriptions.push(
      ctx.commands.register("window.new", () => openEditorWindow()),
    );

    ctx.ui.mountSlot("welcome", <WelcomeView ctx={ctx} />, { id: "welcome.view" });

    // ⌘⇧N opens a fresh window (works from welcome or the editor).
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toUpperCase() === "N") {
        e.preventDefault();
        openEditorWindow();
      }
    };
    window.addEventListener("keydown", onKey);
    ctx.subscriptions.push({ dispose: () => window.removeEventListener("keydown", onKey) });
  },
};
