import "./index.css";
import { bridgeCoreEvents, ipc } from "@jelly/ipc";
import { Kernel, KernelProvider, Shell } from "@jelly/kernel";
import React from "react";
import ReactDOM from "react-dom/client";
import { builtinExtensions } from "./extensions";

/**
 * The thin host: boot the kernel with the real Tauri bridge, attach the native
 * event bridge to its bus, load the built-in extensions, then render the Shell.
 * The app owns no feature code — only this bootstrap and the extension list.
 */
async function boot() {
  const kernel = new Kernel({ ipc });

  // Feed Rust → frontend events onto the kernel bus before anything renders,
  // so no early terminal output or file event is missed.
  bridgeCoreEvents(kernel.events);

  // Activate all extensions (they fill slots) before the first render.
  await kernel.loadAll(builtinExtensions);

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <KernelProvider kernel={kernel}>
        <Shell />
      </KernelProvider>
    </React.StrictMode>,
  );
}

void boot();
