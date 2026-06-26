import type { CommandRegistry } from "../contributions/commands";
import type { EventBus } from "../contributions/events";
import type { KeybindingRegistry } from "../contributions/keybindings";
import type { SettingsRegistry } from "../contributions/settings";
import type { Disposable } from "../core/disposable";
import type { Logger } from "../core/logger";
import type { IpcClient } from "../ipc/client";
import type { KeyValueStore } from "../storage/key-value-store";
import type { UIRegistry } from "../ui/registry";

/** Everything an extension is handed at activation. Its only door to the host. */
export interface ExtensionContext {
  commands: CommandRegistry;
  ui: UIRegistry;
  events: EventBus;
  ipc: IpcClient;
  settings: SettingsRegistry;
  keybindings: KeybindingRegistry;
  storage: KeyValueStore;
  log: Logger;
  /** anything pushed here is auto-disposed on deactivate */
  subscriptions: Disposable[];
}
