import type { Disposable } from "../core/disposable";

export interface KeybindingDescriptor {
  command: string;
  /** e.g. "mod+shift+r" or a chord "mod+k mod+t" */
  key: string;
  /** optional context expression, e.g. "workspaceOpen" or "!terminalFocused" */
  when?: string;
}

/** Where a command's effective binding comes from. */
export type KeybindingSource = "default" | "user";

/**
 * An effective binding plus provenance, for the customization UI. `key` is the
 * effective spec (the user override if present, else the default); `""` means
 * the command is currently unbound. `defaultKey` is the manifest-declared spec
 * (if any) so the UI can offer "reset to default".
 */
export interface KeybindingInfo {
  command: string;
  key: string;
  defaultKey?: string;
  when?: string;
  source: KeybindingSource;
}

export interface KeybindingRegistry {
  /** bind a key (or chord) to a command id */
  bind(key: string, commandId: string): Disposable;
  /** every effective binding (user overrides applied), for cheat sheets */
  list(): KeybindingDescriptor[];
  /** effective bindings with provenance, for the customization UI */
  infos(): KeybindingInfo[];
  /** override a command's binding; `""` unbinds it. Persisted to disk. */
  setUserBinding(command: string, key: string): void;
  /** drop a command's user override, restoring its manifest default. */
  resetBinding(command: string): void;
}
