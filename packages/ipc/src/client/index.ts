import type { IpcClient } from "@jelly/sdk";
import { clipboard } from "./clipboard";
import { drag } from "./drag";
import { fs } from "./fs";
import { git } from "./git";
import { keybindings } from "./keybindings";
import { mcp } from "./mcp";
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
  drag,
  git,
  search,
  terminal,
  workspace,
  settings,
  storage,
  keybindings,
  updater,
  mcp,
};

export { fs, clipboard, drag, git, search, terminal, workspace, settings, storage, keybindings, updater, mcp };
