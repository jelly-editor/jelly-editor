import { beforeEach, describe, expect, test } from "bun:test";
import { leafIds, type LayoutNode, type Pane, newPaneId, useEditorStore } from "./store";

const s = () => useEditorStore.getState();
const active = () => s().getActivePane();
const paneCount = () => leafIds(s().root).length;
const paneWith = (path: string) => Object.values(s().panes).find((p) => p.tabs.some((t) => t.path === path));

function reset() {
  const p: Pane = { id: newPaneId(), tabs: [], activeTabPath: null, activeDiff: null };
  useEditorStore.setState({
    root: { type: "leaf", paneId: p.id },
    panes: { [p.id]: p },
    activePaneId: p.id,
    fileContents: new Map(),
    savedContents: new Map(),
    externallyChanged: new Set(),
    largeFiles: new Set(),
    revealTarget: null,
    closing: null,
    hiddenPaneIds: new Set(),
  });
}

beforeEach(reset);

describe("applyRename", () => {
  test("remaps a single open file's path, name and keyed state", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().updateBuffer("/w/a.ts", "x");
    s().setSaved("/w/a.ts", "x");

    s().applyRename("/w/a.ts", "/w/sub/b.ts");

    const tab = active().tabs.find((t) => t.path === "/w/sub/b.ts");
    expect(tab?.name).toBe("b.ts");
    expect(active().activeTabPath).toBe("/w/sub/b.ts");
    expect(s().fileContents.get("/w/sub/b.ts")).toBe("x");
    expect(s().fileContents.has("/w/a.ts")).toBe(false);
  });

  test("moving a folder remaps every descendant tab", () => {
    s().openPinned("/w/src/a.ts", "a.ts");
    s().openPinned("/w/src/deep/b.ts", "b.ts");
    s().openPinned("/w/other.ts", "other.ts");

    s().applyRename("/w/src", "/w/lib/src");

    const paths = active().tabs.map((t) => t.path).sort();
    expect(paths).toEqual(["/w/lib/src/a.ts", "/w/lib/src/deep/b.ts", "/w/other.ts"]);
  });
});

describe("splitting", () => {
  test("splitActive moves the active tab into a new focused pane (row)", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openPinned("/w/b.ts", "b.ts");
    s().openPinned("/w/c.ts", "c.ts"); // [a, b, c], active c
    s().splitActive("right");

    expect(paneCount()).toBe(2);
    const root = s().root as Extract<LayoutNode, { type: "split" }>;
    expect(root.type).toBe("split");
    expect(root.dir).toBe("row");
    expect(active().tabs.map((t) => t.path)).toEqual(["/w/c.ts"]);
    expect(paneWith("/w/a.ts")?.tabs.map((t) => t.path)).toEqual(["/w/a.ts", "/w/b.ts"]);
  });

  test("splitActive down nests a column split", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().splitActive("down");
    const root = s().root as Extract<LayoutNode, { type: "split" }>;
    expect(root.dir).toBe("column");
    expect(paneCount()).toBe(2);
  });

  test("a tab dropped on a pane edge builds a nested 2x2", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openPinned("/w/b.ts", "b.ts"); // pane0: [a, b]
    s().splitActive("right"); // pane0: [a], pane1: [b]
    const pane0 = paneWith("/w/a.ts")!.id;
    const pane1 = paneWith("/w/b.ts")!.id;
    s().setActivePane(pane0);
    s().openPinned("/w/c.ts", "c.ts"); // pane0: [a, c]

    s().dropTabOnPaneEdge(pane0, "/w/c.ts", pane1, "bottom");

    expect(paneCount()).toBe(3);
    const root = s().root as Extract<LayoutNode, { type: "split" }>;
    expect(root.dir).toBe("row");
    const right = root.children[1];
    expect(right.type).toBe("split");
    if (right.type === "split") expect(right.dir).toBe("column");
    expect(paneWith("/w/c.ts")?.tabs.map((t) => t.path)).toEqual(["/w/c.ts"]);
  });

  test("dropping a tab on a pane edge moves it out of the source pane", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openPinned("/w/b.ts", "b.ts");
    s().splitActive("right"); // pane0: [a], pane1: [b]
    const pane0 = paneWith("/w/a.ts")!.id;
    const pane1 = paneWith("/w/b.ts")!.id;
    s().setActivePane(pane0);
    s().openPinned("/w/c.ts", "c.ts"); // pane0: [a, c]

    s().dropTabOnPaneEdge(pane0, "/w/c.ts", pane1, "bottom");

    expect(paneCount()).toBe(3);
    expect(s().panes[pane0].tabs.map((t) => t.path)).toEqual(["/w/a.ts"]);
    expect(paneWith("/w/c.ts")?.tabs.map((t) => t.path)).toEqual(["/w/c.ts"]);
  });
});

describe("closing", () => {
  test("closing the last tab in a pane collapses it", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().splitActive("right"); // empty source pane + [a]
    const withA = paneWith("/w/a.ts")!.id;
    s().closeTab(withA, "/w/a.ts");
    expect(paneCount()).toBe(1);
  });

  test("closing the only tab in the only pane empties it without collapsing", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().closeTab(active().id, "/w/a.ts");
    expect(paneCount()).toBe(1);
    expect(active().tabs).toHaveLength(0);
    expect(s().fileContents.has("/w/a.ts")).toBe(false);
  });

  test("closeEverywhere removes a deleted file from all panes", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openPinned("/w/b.ts", "b.ts");
    s().splitActive("right");
    const pane0 = paneWith("/w/a.ts")!.id;
    s().setActivePane(pane0);
    s().openPinned("/w/b.ts", "b.ts"); // b open in both panes

    s().closeEverywhere("/w/b.ts");

    expect(Object.values(s().panes).flatMap((p) => p.tabs.map((t) => t.path))).not.toContain("/w/b.ts");
    expect(s().fileContents.has("/w/b.ts")).toBe(false);
  });
});

describe("moveTab (drag center)", () => {
  test("moves a tab into another pane and focuses it", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openPinned("/w/b.ts", "b.ts");
    s().openPinned("/w/c.ts", "c.ts"); // [a, b, c]
    s().splitActive("right"); // pane0: [a, b], pane1: [c]
    const pane0 = paneWith("/w/a.ts")!.id;
    const pane1 = paneWith("/w/c.ts")!.id;

    s().moveTab(pane0, pane1, "/w/a.ts");

    expect(paneCount()).toBe(2);
    expect(s().panes[pane1].tabs.map((t) => t.path)).toEqual(["/w/c.ts", "/w/a.ts"]);
    expect(s().panes[pane0].tabs.map((t) => t.path)).toEqual(["/w/b.ts"]);
    expect(s().activePaneId).toBe(pane1);
  });

  test("dragging the last tab out collapses the emptied source", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openPinned("/w/b.ts", "b.ts");
    s().splitActive("right"); // pane0: [a], pane1: [b]
    const pane0 = paneWith("/w/a.ts")!.id;
    const pane1 = paneWith("/w/b.ts")!.id;

    s().moveTab(pane0, pane1, "/w/a.ts");

    expect(paneCount()).toBe(1);
    expect(s().panes[pane1].tabs.map((t) => t.path)).toEqual(["/w/b.ts", "/w/a.ts"]);
  });
});

describe("contributed views (terminals)", () => {
  test("openView adds a view tab and it can be dragged into a file pane", () => {
    s().openPinned("/w/a.ts", "a.ts");
    const filePaneId = active().id;
    s().openView("terminal", "t1", "Terminal 1", "group-bottom");
    const tab = active().tabs.find((t) => t.kind === "view");
    expect(tab?.viewType).toBe("terminal");
    expect(tab?.viewId).toBe("t1");
    expect(active().activeTabPath).toBe("view:terminal:t1");

    s().moveTab(active().id, filePaneId, "view:terminal:t1");
    expect(paneCount()).toBe(1);
    expect(s().panes[filePaneId].tabs.map((t) => t.path)).toEqual(["/w/a.ts", "view:terminal:t1"]);
  });

  test("group-bottom opens a dedicated bottom pane and groups same-type views", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openView("terminal", "t1", "Terminal 1", "group-bottom");

    expect(paneCount()).toBe(2);
    const root = s().root as Extract<LayoutNode, { type: "split" }>;
    expect(root.dir).toBe("column");
    // The file pane stays on top; the terminal gets its own pane below.
    expect(paneWith("/w/a.ts")?.tabs.some((t) => t.kind === "view")).toBe(false);
    const termPane = paneWith("view:terminal:t1")!;
    expect(termPane.tabs.map((t) => t.viewId)).toEqual(["t1"]);

    s().openView("terminal", "t2", "Terminal 2", "group-bottom");
    expect(paneCount()).toBe(2); // grouped, no new pane
    expect(paneWith("view:terminal:t2")?.id).toBe(termPane.id);
  });

  test("closing a view tab prunes nothing from file content maps", () => {
    s().openView("terminal", "t1", "Terminal 1");
    s().closeTab(active().id, "view:terminal:t1");
    expect(active().tabs).toHaveLength(0);
  });

  test("opening a file while terminal pane is active targets the file pane", () => {
    s().openPinned("/w/a.ts", "a.ts");
    const filePaneId = active().id;
    s().openView("terminal", "t1", "Terminal 1", "group-bottom");
    const termPaneId = active().id;

    s().openPinned("/w/b.ts", "b.ts");

    expect(s().activePaneId).toBe(filePaneId);
    expect(s().panes[filePaneId].tabs.map((t) => t.path)).toEqual(["/w/a.ts", "/w/b.ts"]);
    expect(s().panes[termPaneId].tabs.map((t) => t.path)).toEqual(["view:terminal:t1"]);
  });

  test("explicit pane drops can open files in a view pane", () => {
    s().openPinned("/w/a.ts", "a.ts");
    const filePaneId = active().id;
    s().openView("terminal", "t1", "Terminal 1", "group-bottom");
    const termPaneId = active().id;

    s().openPinnedInPane(termPaneId, "/w/b.ts", "b.ts");

    expect(s().activePaneId).toBe(termPaneId);
    expect(s().panes[termPaneId].tabs.map((t) => t.path)).toEqual(["view:terminal:t1", "/w/b.ts"]);
    expect(s().panes[filePaneId].tabs.map((t) => t.path)).toEqual(["/w/a.ts"]);
  });

  test("toggleViewType hides and restores an active terminal pane without closing it", () => {
    s().openPinned("/w/a.ts", "a.ts");
    const filePaneId = active().id;
    s().openView("terminal", "t1", "Terminal 1", "group-bottom");
    const termPaneId = active().id;

    expect(s().toggleViewType("terminal")).toBe(true);
    expect(s().hiddenPaneIds.has(termPaneId)).toBe(true);
    expect(s().panes[termPaneId].tabs.map((t) => t.path)).toEqual(["view:terminal:t1"]);
    expect(s().activePaneId).toBe(filePaneId);

    expect(s().toggleViewType("terminal")).toBe(true);
    expect(s().hiddenPaneIds.has(termPaneId)).toBe(false);
    expect(s().activePaneId).toBe(termPaneId);
    expect(active().activeTabPath).toBe("view:terminal:t1");
  });

  test("toggleViewType returns false when no view of that type exists", () => {
    expect(s().toggleViewType("terminal")).toBe(false);
  });

  test("group-bottom docks the terminal below an empty editor pane when no files are open", () => {
    s().openView("terminal", "t1", "Terminal 1", "group-bottom");

    expect(paneCount()).toBe(2);
    const root = s().root as Extract<LayoutNode, { type: "split" }>;
    expect(root.dir).toBe("column");
    const termPane = paneWith("view:terminal:t1")!;
    expect(termPane.tabs.map((t) => t.viewId)).toEqual(["t1"]);
    const editorPane = Object.values(s().panes).find((p) => p.id !== termPane.id)!;
    expect(editorPane.tabs).toHaveLength(0);
  });

  test("toggleViewType hides a terminal that is the only pane by revealing an editor pane", () => {
    s().openView("terminal", "t1", "Terminal 1");
    const termPaneId = active().id;
    expect(paneCount()).toBe(1);

    expect(s().toggleViewType("terminal")).toBe(true);
    expect(s().hiddenPaneIds.has(termPaneId)).toBe(true);
    expect(active().id).not.toBe(termPaneId);
    expect(active().tabs).toHaveLength(0);

    expect(s().toggleViewType("terminal")).toBe(true);
    expect(s().hiddenPaneIds.has(termPaneId)).toBe(false);
    expect(s().activePaneId).toBe(termPaneId);
  });
});

describe("diffs", () => {
  test("openDiff shows the diff in the lone empty pane in place", () => {
    s().openDiff({ path: "/w/a.ts", workspace: "/w" });
    expect(paneCount()).toBe(1);
    expect(active().activeDiff?.path).toBe("/w/a.ts");
  });

  test("openDiff splits a new pane when a file is already open", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openDiff({ path: "/w/a.ts", workspace: "/w" });
    expect(paneCount()).toBe(2);
    expect(active().activeDiff?.path).toBe("/w/a.ts");
  });

  test("a second diff reuses the existing diff pane", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openDiff({ path: "/w/a.ts", workspace: "/w" });
    s().openDiff({ path: "/w/b.ts", workspace: "/w" });
    expect(paneCount()).toBe(2);
    const diffPanes = Object.values(s().panes).filter((p) => p.activeDiff);
    expect(diffPanes).toHaveLength(1);
    expect(diffPanes[0].activeDiff?.path).toBe("/w/b.ts");
  });

  test("closing a diff in a tab-less pane collapses it", () => {
    s().openPinned("/w/a.ts", "a.ts");
    s().openDiff({ path: "/w/a.ts", workspace: "/w" });
    const diffPaneId = Object.values(s().panes).find((p) => p.activeDiff)!.id;
    s().closeDiff(diffPaneId);
    expect(paneCount()).toBe(1);
  });
});
