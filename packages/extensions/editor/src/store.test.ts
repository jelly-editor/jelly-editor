import { beforeEach, describe, expect, test } from "bun:test";
import { useEditorStore } from "./store";

const s = () => useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState({
    tabs: [],
    activeTabPath: null,
    fileContents: new Map(),
    savedContents: new Map(),
    externallyChanged: new Set(),
    largeFiles: new Set(),
  });
});

describe("applyRename", () => {
  test("remaps a single open file's path, name and keyed state", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().updateBuffer("/w/a.ts", "x");
    s().setSaved("/w/a.ts", "x");

    s().applyRename("/w/a.ts", "/w/sub/b.ts");

    const tab = s().tabs.find((t) => t.path === "/w/sub/b.ts");
    expect(tab?.name).toBe("b.ts");
    expect(s().activeTabPath).toBe("/w/sub/b.ts");
    expect(s().fileContents.get("/w/sub/b.ts")).toBe("x");
    expect(s().savedContents.get("/w/sub/b.ts")).toBe("x");
    expect(s().fileContents.has("/w/a.ts")).toBe(false);
  });

  test("moving a folder remaps every descendant tab, keeping their names", () => {
    s().openPinned("/w/src/a.ts", "a.ts");
    s().openPinned("/w/src/deep/b.ts", "b.ts");
    s().openPinned("/w/other.ts", "other.ts");

    s().applyRename("/w/src", "/w/lib/src");

    const paths = s().tabs.map((t) => t.path).sort();
    expect(paths).toEqual(["/w/lib/src/a.ts", "/w/lib/src/deep/b.ts", "/w/other.ts"]);
    // The basename is unchanged by a move.
    expect(s().tabs.find((t) => t.path === "/w/lib/src/deep/b.ts")?.name).toBe("b.ts");
    // Untouched sibling stays put.
    expect(s().tabs.find((t) => t.path === "/w/other.ts")?.name).toBe("other.ts");
  });

  test("a prefix that is not a path boundary is left alone", () => {
    s().openPinned("/w/source.ts", "source.ts");
    s().applyRename("/w/src", "/w/lib");
    expect(s().tabs[0]?.path).toBe("/w/source.ts");
  });

  test("no open tab matches — nothing changes", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().applyRename("/w/zzz.ts", "/w/yyy.ts");
    expect(s().tabs[0]?.path).toBe("/w/a.ts");
    expect(s().activeTabPath).toBe("/w/a.ts");
  });
});
