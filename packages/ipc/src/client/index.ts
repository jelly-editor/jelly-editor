import type { IpcClient } from "@jelly/sdk";
import { fs } from "./fs";
import { git } from "./git";
import { keybindings } from "./keybindings";
import { search } from "./search";
import { settings } from "./settings";
import { terminal } from "./terminal";
import { updater } from "./updater";
import { workspace } from "./workspace";

/** The typed command client implementing the SDK IpcClient contract. */
export const ipc: IpcClient = { fs, git, search, terminal, workspace, settings, keybindings, updater };

export { fs, git, search, terminal, workspace, settings, keybindings, updater };
