import type { Extension } from "@jelly/sdk";
import { welcomeExtension } from "@jelly/welcome";
import { filesExtension } from "@jelly/files";
import { editorExtension } from "@jelly/editor";
import { terminalExtension } from "@jelly/terminal";
import { gitExtension } from "@jelly/git";
import { searchExtension } from "@jelly/search";
import { settingsExtension } from "@jelly/settings";
import { commandPaletteExtension } from "@jelly/command-palette";

/**
 * The built-in extensions, in load order. `files` precedes `git`/`terminal`
 * because they query its `workspace.getPath` command during activation.
 */
export const builtinExtensions: Extension[] = [
  welcomeExtension,
  filesExtension,
  editorExtension,
  terminalExtension,
  gitExtension,
  searchExtension,
  settingsExtension,
  commandPaletteExtension,
];
