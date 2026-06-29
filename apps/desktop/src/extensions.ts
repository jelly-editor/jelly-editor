import type { Extension } from "@jelly/sdk";
import { welcomeExtension } from "@jelly/welcome";
import { filesExtension } from "@jelly/files";
import { editorExtension } from "@jelly/editor";
import { terminalExtension } from "@jelly/terminal";
import { gitExtension } from "@jelly/git";
import { searchExtension } from "@jelly/search";
import { settingsExtension } from "@jelly/settings";
import { commandPaletteExtension } from "@jelly/command-palette";
import { gamesExtension } from "@jelly/games";
import { typingTestExtension } from "@jelly/typing-test";
import { notesExtension } from "@jelly/notes";
import { telemetryExtension } from "@jelly/telemetry";

/**
 * The built-in extensions, in load order. `files` precedes `git`/`terminal`
 * because they query its `workspace.getPath` command during activation.
 * `games` precedes game extensions so `games.register` is available on activate.
 */
export const builtinExtensions: Extension[] = [
  telemetryExtension,
  welcomeExtension,
  filesExtension,
  editorExtension,
  terminalExtension,
  gitExtension,
  searchExtension,
  settingsExtension,
  commandPaletteExtension,
  gamesExtension,
  typingTestExtension,
  notesExtension,
];
