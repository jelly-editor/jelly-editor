import "./index.css";
import { bridgeCoreEvents, getInitialPath, ipc } from "@jelly/ipc";
import { Kernel, KernelProvider, Shell } from "@jelly/kernel";
import { listen } from "@tauri-apps/api/event";
import React from "react";
import ReactDOM from "react-dom/client";
import { DialogHost } from "./DialogHost";
import { NotificationHost } from "./NotificationHost";
import { builtinExtensions } from "./extensions";

/**
 * The thin host: boot the kernel with the real Tauri bridge, attach the native
 * event bridge to its bus, load the built-in extensions, then render the Shell.
 * The app owns no feature code — only this bootstrap and the extension list.
 */
async function boot() {
  const kernel = new Kernel({ ipc });

  // Load persisted settings before extensions activate so they see saved values.
  await kernel.init();

  // Feed Rust → frontend events onto the kernel bus before anything renders,
  // so no early terminal output or file event is missed.
  bridgeCoreEvents(kernel.events);

  // Activate all extensions (they fill slots) before the first render.
  await kernel.loadAll(builtinExtensions);

  // Now that every extension's manifest keybindings are registered, attach the
  // single global key dispatcher (replaces per-extension keydown listeners).
  kernel.installKeyDispatch(window);

  await listen("menu:check_for_updates", () => {
    void kernel.commands.execute("settings.checkForUpdates");
  });

  // If this window was opened via `jelly <path>`, open that folder.
  const initialPath = await getInitialPath();
  if (initialPath) {
    void kernel.commands.execute("workspace.open", initialPath);
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <KernelProvider kernel={kernel}>
        <Shell />
        <DialogHost />
        <NotificationHost />
      </KernelProvider>
    </React.StrictMode>,
  );
}

void boot();
