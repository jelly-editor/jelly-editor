import type { IpcClient } from "@jelly/sdk";
import { fs } from "./fs";
import { git } from "./git";
import { terminal } from "./terminal";
import { workspace } from "./workspace";

/** The typed command client implementing the SDK IpcClient contract. */
export const ipc: IpcClient = { fs, git, terminal, workspace };

export { fs, git, terminal, workspace };
