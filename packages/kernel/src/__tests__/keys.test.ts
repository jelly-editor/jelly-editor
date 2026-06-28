import { describe, expect, test } from "bun:test";
import { parseKey, matchChord, isModifierEvent, formatKey, isMac } from "../registries/keys";

/** Build a fake KeyboardEvent with only the fields the matcher reads. */
function ev(init: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    key: "",
    preventDefault() {},
    ...init,
  } as KeyboardEvent;
}

/** Set the `mod` modifier on whichever physical key it maps to on this OS. */
const modKey = isMac ? { metaKey: true } : { ctrlKey: true };

describe("parseKey", () => {
  test("parses a single chord into modifiers + key", () => {
    expect(parseKey("mod+shift+f")).toEqual([
      { mod: true, ctrl: false, alt: false, shift: true, key: "f" },
    ]);
  });

  test("splits a multi-stroke chord on whitespace", () => {
    const chords = parseKey("mod+k mod+s");
    expect(chords).toHaveLength(2);
    expect(chords[1].key).toBe("s");
  });

  test("treats ctrl as distinct from mod", () => {
    expect(parseKey("ctrl+`")[0]).toMatchObject({ ctrl: true, mod: false, key: "`" });
  });
});

describe("matchChord", () => {
  const [chord] = parseKey("mod+shift+f");

  test("matches when modifiers and key line up", () => {
    expect(matchChord(chord, ev({ ...modKey, shiftKey: true, key: "F" }))).toBe(true);
  });

  test("rejects when a required modifier is missing", () => {
    expect(matchChord(chord, ev({ ...modKey, key: "f" }))).toBe(false);
  });

  test("rejects when an extra modifier is held", () => {
    expect(matchChord(chord, ev({ ...modKey, shiftKey: true, altKey: true, key: "f" }))).toBe(false);
  });

  test("literal ctrl binding matches the Ctrl key", () => {
    const [ctrlChord] = parseKey("ctrl+`");
    expect(matchChord(ctrlChord, ev({ ctrlKey: true, key: "`" }))).toBe(true);
  });

  test("falls back to physical code when Alt rewrites the glyph", () => {
    // macOS: Option+[ produces e.key "“" but e.code stays "BracketLeft".
    const [chord] = parseKey("mod+alt+[");
    expect(matchChord(chord, ev({ ...modKey, altKey: true, key: "“", code: "BracketLeft" }))).toBe(
      true,
    );
  });
});

describe("isModifierEvent", () => {
  test("true for lone modifier presses", () => {
    expect(isModifierEvent(ev({ key: "Shift" }))).toBe(true);
    expect(isModifierEvent(ev({ key: "Meta" }))).toBe(true);
  });
  test("false for real keys", () => {
    expect(isModifierEvent(ev({ key: "f" }))).toBe(false);
  });
});

describe("formatKey", () => {
  test("renders a readable platform label", () => {
    expect(formatKey("mod+shift+f")).toBe(isMac ? "⇧⌘F" : "Ctrl+Shift+F");
  });
});
