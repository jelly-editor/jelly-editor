import type { Disposable, Extension, ExtensionContext, IpcClient } from "@jelly/sdk";
import { PrefixedLogger } from "../registries/logger";
import { PersistentKeyValueStore } from "../registries/storage";

/** Shared, kernel-wide services handed to every extension. */
export interface KernelServices {
  commands: ExtensionContext["commands"];
  ui: ExtensionContext["ui"];
  dialog: ExtensionContext["dialog"];
  notifications: ExtensionContext["notifications"];
  events: ExtensionContext["events"];
  settings: ExtensionContext["settings"];
  keybindings: ExtensionContext["keybindings"];
  palette: ExtensionContext["palette"];
  ipc: IpcClient;
}

/**
 * Wrap a registry so any Disposable it returns is also recorded on `subs`. This
 * is what lets the kernel auto-clean an extension on deactivate even when the
 * author forgets to push onto ctx.subscriptions. Idempotent dispose (see
 * toDisposable) makes the occasional double-track harmless.
 */
function autoTrack<T extends object>(impl: T, subs: Disposable[]): T {
  return new Proxy(impl, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const result = (value as (...a: unknown[]) => unknown).apply(target, args);
        if (isDisposable(result)) subs.push(result);
        return result;
      };
    },
  });
}

function isDisposable(value: unknown): value is Disposable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Disposable).dispose === "function"
  );
}

/**
 * Build the ExtensionContext for one extension. The returned `subscriptions`
 * array is the same one exposed as `ctx.subscriptions`; the kernel disposes it
 * on deactivate.
 */
export function createExtensionContext(
  services: KernelServices,
  extension: Extension,
): ExtensionContext {
  const subscriptions: Disposable[] = [];
  return {
    commands: autoTrack(services.commands, subscriptions),
    ui: autoTrack(services.ui, subscriptions),
    dialog: services.dialog,
    notifications: services.notifications,
    events: autoTrack(services.events, subscriptions),
    settings: autoTrack(services.settings, subscriptions),
    keybindings: autoTrack(services.keybindings, subscriptions),
    palette: autoTrack(services.palette, subscriptions),
    ipc: services.ipc,
    storage: new PersistentKeyValueStore(extension.manifest.id, services.ipc),
    log: new PrefixedLogger(extension.manifest.id),
    subscriptions,
  };
}
