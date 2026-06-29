/**
 * Key-string parsing and event matching. A binding key is one or more
 * space-separated chords (e.g. "mod+k mod+s"); each chord is "+"-joined tokens.
 * `mod` is the platform-primary modifier — ⌘ on macOS, Ctrl elsewhere — while
 * `ctrl` is always the literal Control key (so "ctrl+`" stays Control on mac).
 */
export interface Chord {
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** the lowercased non-modifier key, e.g. "f", "`", "," */
  key: string;
}

export const isMac =
  typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

/** Parse a full key spec into its chord sequence. */
export function parseKey(spec: string): Chord[] {
  return spec
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseChord);
}

function parseChord(part: string): Chord {
  const chord: Chord = { mod: false, ctrl: false, alt: false, shift: false, key: "" };
  for (const raw of part.split("+")) {
    const token = raw.toLowerCase();
    switch (token) {
      case "mod":
      case "cmd":
      case "meta":
        chord.mod = true;
        break;
      case "ctrl":
      case "control":
        chord.ctrl = true;
        break;
      case "alt":
      case "option":
        chord.alt = true;
        break;
      case "shift":
        chord.shift = true;
        break;
      default:
        chord.key = token;
    }
  }
  return chord;
}

/** Normalize a KeyboardEvent.key to compare against a parsed chord key. */
export function eventKey(e: KeyboardEvent): string {
  return e.key.toLowerCase();
}

/**
 * Physical-key fallback for punctuation. Holding Alt on macOS rewrites
 * `e.key` to a typographic glyph (Option+[ → "“"), so a binding like
 * `mod+alt+[` would never match by `e.key`. `e.code` is layout-shifted but
 * modifier-stable, so we map the symbol codes back to their base character.
 * Restricted to punctuation — letters/digits keep their layout-aware `e.key`
 * matching so non-QWERTY layouts aren't double-bound.
 */
const SYMBOL_CODE: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
};

/** Does the event's key — by glyph or physical symbol code — equal `key`? */
function keyMatches(e: KeyboardEvent, key: string): boolean {
  if (eventKey(e) === key) return true;
  if (SYMBOL_CODE[e.code] === key) return true;
  if (e.altKey) {
    const codeBase = e.code.startsWith("Key") ? e.code.slice(3).toLowerCase()
      : e.code.startsWith("Digit") ? e.code.slice(5)
      : null;
    if (codeBase === key) return true;
  }
  return false;
}

/** True if the event is just a modifier being pressed (no real key yet). */
export function isModifierEvent(e: KeyboardEvent): boolean {
  return e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta";
}

/** Does this keyboard event satisfy the given chord, accounting for platform? */
export function matchChord(chord: Chord, e: KeyboardEvent): boolean {
  // On non-mac, `mod` and `ctrl` are both the physical Ctrl key.
  const needCtrl = isMac ? chord.ctrl : chord.mod || chord.ctrl;
  const needMeta = isMac ? chord.mod : false;
  return (
    e.ctrlKey === needCtrl &&
    e.metaKey === needMeta &&
    e.altKey === chord.alt &&
    e.shiftKey === chord.shift &&
    keyMatches(e, chord.key)
  );
}

/** Pretty-print a key spec for display, e.g. "mod+shift+f" → "⌘⇧F" on mac. */
export function formatKey(spec: string): string {
  return parseKey(spec)
    .map((c) => formatChord(c))
    .join(" ");
}

function formatChord(c: Chord): string {
  const parts: string[] = [];
  if (isMac) {
    if (c.ctrl) parts.push("⌃");
    if (c.alt) parts.push("⌥");
    if (c.shift) parts.push("⇧");
    if (c.mod) parts.push("⌘");
  } else {
    if (c.mod || c.ctrl) parts.push("Ctrl");
    if (c.alt) parts.push("Alt");
    if (c.shift) parts.push("Shift");
  }
  parts.push(formatKeyName(c.key));
  return isMac ? parts.join("") : parts.join("+");
}

function formatKeyName(key: string): string {
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}
