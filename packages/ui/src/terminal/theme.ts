import type { ITheme } from "@xterm/xterm";

// Concrete hex palettes (xterm can't parse oklch). Background/foreground/accent
// are converted from the app's oklch tokens; the 16 ANSI colors use a Nord-ish
// set that reads well on the warm dark/light backgrounds.

const dark: ITheme = {
  background: "#141412", // matches --color-bg-elevated (the terminal pane)
  foreground: "#e2ddd5",
  cursor: "#c97940",
  cursorAccent: "#141412",
  selectionBackground: "rgba(201, 121, 64, 0.3)",
  black: "#3b4252",
  red: "#bf616a",
  green: "#a3be8c",
  yellow: "#ebcb8b",
  blue: "#81a1c1",
  magenta: "#b48ead",
  cyan: "#88c0d0",
  white: "#d8dee9",
  brightBlack: "#4c566a",
  brightRed: "#d08770",
  brightGreen: "#a3be8c",
  brightYellow: "#ebcb8b",
  brightBlue: "#88c0d0",
  brightMagenta: "#b48ead",
  brightCyan: "#8fbcbb",
  brightWhite: "#eceff4",
};

const light: ITheme = {
  background: "#fdfcf8", // matches --color-bg-elevated (the terminal pane)
  foreground: "#1c1a16",
  cursor: "#b86a2e",
  cursorAccent: "#fdfcf8",
  selectionBackground: "rgba(184, 106, 46, 0.25)",
  black: "#3b4252",
  red: "#b1361e",
  green: "#0a7d33",
  yellow: "#b15c00",
  blue: "#0550ae",
  magenta: "#8250df",
  cyan: "#007373",
  white: "#5e5a54",
  brightBlack: "#7a7266",
  brightRed: "#c0432a",
  brightGreen: "#0a7d33",
  brightYellow: "#b15c00",
  brightBlue: "#0550ae",
  brightMagenta: "#8250df",
  brightCyan: "#007373",
  brightWhite: "#1c1a16",
};

export function terminalTheme(mode: "dark" | "light"): ITheme {
  return mode === "light" ? light : dark;
}
