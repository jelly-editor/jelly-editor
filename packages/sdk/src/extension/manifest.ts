import type { CommandDescriptor } from "../contributions/commands";
import type { KeybindingDescriptor } from "../contributions/keybindings";
import type { SettingsSchema } from "../contributions/settings";

/** Declarative view contribution, statically inspectable from the manifest. */
export interface ViewDescriptor {
  id: string;
  title?: string;
}

export interface ExtensionManifest {
  /** reverse-dns, globally unique, stable forever (e.g. "jelly.files"). */
  id: string;
  name: string;
  version: string;
  /** Declarative contributions — readable without running the extension. */
  contributes?: {
    commands?: CommandDescriptor[];
    views?: ViewDescriptor[];
    keybindings?: KeybindingDescriptor[];
    settings?: SettingsSchema;
  };
}
