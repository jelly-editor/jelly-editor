/**
 * Display-only formatting for keybinding specs (e.g. "mod+shift+f" → "⌘⇧F").
 * The kernel owns matching; this is purely for showing shortcuts to the user in
 * the command palette and the keyboard-shortcuts cheat sheet.
 */

const isMac =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

const SYMBOL: Record<string, string> = {
  enter: "↵",
  escape: "Esc",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  backspace: "⌫",
  delete: "⌦",
  tab: "⇥",
  " ": "Space",
  space: "Space",
};

function keyName(key: string): string {
  const lower = key.toLowerCase();
  if (SYMBOL[lower]) return SYMBOL[lower];
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatChord(part: string): string {
  let mod = false;
  let ctrl = false;
  let alt = false;
  let shift = false;
  let key = "";
  for (const raw of part.split("+")) {
    switch (raw.toLowerCase()) {
      case "mod":
      case "cmd":
      case "meta":
        mod = true;
        break;
      case "ctrl":
      case "control":
        ctrl = true;
        break;
      case "alt":
      case "option":
        alt = true;
        break;
      case "shift":
        shift = true;
        break;
      default:
        key = raw;
    }
  }

  if (isMac) {
    const parts: string[] = [];
    if (ctrl) parts.push("⌃");
    if (alt) parts.push("⌥");
    if (shift) parts.push("⇧");
    if (mod) parts.push("⌘");
    parts.push(keyName(key));
    return parts.join("");
  }

  const parts: string[] = [];
  if (mod || ctrl) parts.push("Ctrl");
  if (alt) parts.push("Alt");
  if (shift) parts.push("Shift");
  parts.push(keyName(key));
  return parts.join("+");
}

/** Format a full key spec (chords separated by spaces) for display. */
export function formatKeybinding(spec: string): string {
  return spec
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(formatChord)
    .join(" ");
}
