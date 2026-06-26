import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Disposable, EventBus } from "@jelly/sdk";
import { CORE_EVENT_NAMES } from "./core-events";

/**
 * Attach the Rust → frontend event listeners and re-emit each onto the kernel
 * EventBus under the same name. This is the single place the host subscribes to
 * native events; extensions then react via `ctx.events.on(...)`.
 *
 * Call once at startup (before React renders) so no early output is missed.
 */
export function bridgeCoreEvents(bus: EventBus): Disposable {
  const unlisten: UnlistenFn[] = [];
  let disposed = false;

  for (const name of CORE_EVENT_NAMES) {
    void listen(name, (event) => bus.emit(name, event.payload)).then((un) => {
      if (disposed) un();
      else unlisten.push(un);
    });
  }

  return {
    dispose() {
      disposed = true;
      while (unlisten.length) unlisten.pop()!();
    },
  };
}
