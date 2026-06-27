import type { Extension, ExtensionContext } from "@jelly/sdk";
import { installShellCommand, openEditorWindow } from "@jelly/ipc";
import { WelcomeView } from "./ui/WelcomeView";

export const welcomeExtension: Extension = {
  manifest: {
    id: "jelly.welcome",
    name: "Welcome",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "window.new", title: "New Window" },
        { id: "shell.installCommand", title: "Install 'jelly' command in PATH" },
      ],
      keybindings: [{ command: "window.new", key: "mod+shift+n" }],
    },
  },

  activate(ctx: ExtensionContext) {
    ctx.subscriptions.push(
      ctx.commands.register("window.new", () => openEditorWindow()),

      ctx.commands.register("shell.installCommand", async () => {
        try {
          const result = await installShellCommand();
          const pathMsg = result.pathAdded && result.shellConfig
            ? `\n\nAdded ~/.local/bin to PATH in ${result.shellConfig}.\nRestart your terminal (or run: source ${result.shellConfig}) to use 'jelly' right away.`
            : "";
          alert(`Installed at ${result.scriptPath}.${pathMsg}`);
        } catch (err) {
          alert(`Failed to install: ${err}`);
        }
      }),
    );

    ctx.ui.mountSlot("welcome", <WelcomeView ctx={ctx} />, { id: "welcome.view" });
  },
};
