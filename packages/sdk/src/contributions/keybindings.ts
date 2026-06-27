import type { Disposable } from "../core/disposable";

export interface KeybindingDescriptor {
  command: string;
  /** e.g. "mod+shift+r" or a chord "mod+k mod+t" */
  key: string;
  /** optional context expression, e.g. "workspaceOpen" or "!terminalFocused" */
  when?: string;
}

export interface KeybindingRegistry {
  /** bind a key (or chord) to a command id */
  bind(key: string, commandId: string): Disposable;
  /** every active binding, for cheat sheets and the customization UI */
  list(): KeybindingDescriptor[];
}
