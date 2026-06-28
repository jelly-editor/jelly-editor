import type { IpcClient } from "@jelly/sdk";
import { clipboard } from "./clipboard";
import { fs } from "./fs";
import { git } from "./git";
import { keybindings } from "./keybindings";
import { search } from "./search";
import { settings } from "./settings";
import { storage } from "./storage";
import { terminal } from "./terminal";
import { updater } from "./updater";
import { workspace } from "./workspace";

/** The typed command client implementing the SDK IpcClient contract. */
export const ipc: IpcClient = {
  fs,
  clipboard,
  git,
  search,
  terminal,
  workspace,
  settings,
  storage,
  keybindings,
  updater,
};

export { fs, clipboard, git, search, terminal, workspace, settings, storage, keybindings, updater };
