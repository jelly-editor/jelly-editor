import { beforeEach, describe, expect, test } from "bun:test";
import type { DirEntry } from "@jelly/sdk";
import { useWorkspaceStore } from "./store";

const dir = (path: string, children?: DirEntry[]): DirEntry => ({
  name: path.slice(path.lastIndexOf("/") + 1),
  path,
  isDir: true,
  ignored: false,
  ...(children ? { children } : {}),
});
const file = (path: string): DirEntry => ({
  name: path.slice(path.lastIndexOf("/") + 1),
  path,
  isDir: false,
  ignored: false,
});

const s = () => useWorkspaceStore.getState();

beforeEach(() => {
  // /w
  //   sub/        (expanded, loaded)
  //     deep/     (expanded, loaded -> [d.ts])
  //     a.ts
  //   b.ts
  s().setWorkspace("/w", [
    dir("/w/sub", [dir("/w/sub/deep", [file("/w/sub/deep/d.ts")]), file("/w/sub/a.ts")]),
    file("/w/b.ts"),
  ]);
});

const findDeep = () =>
  (s().tree.find((n) => n.path === "/w/sub")?.children?.find((n) => n.path === "/w/sub/deep"));

describe("setChildren preserves loaded subtrees on refresh", () => {
  test("refreshing root keeps nested folders' loaded children", () => {
    // Simulates the post-move refresh of the root after dragging b.ts away.
    s().setChildren("/w", [dir("/w/sub")]);
    // sub still has its children, and sub/deep still has its loaded subtree.
    const sub = s().tree.find((n) => n.path === "/w/sub");
    expect(sub?.children).toBeDefined();
    expect(sub?.children?.find((n) => n.path === "/w/sub/deep")?.children).toHaveLength(1);
  });

  test("refreshing a directory keeps an expanded subfolder's subtree", () => {
    s().setChildren("/w/sub", [dir("/w/sub/deep"), file("/w/sub/a.ts"), file("/w/sub/c.ts")]);
    expect(findDeep()?.children).toHaveLength(1); // not collapsed
    expect(s().tree.find((n) => n.path === "/w/sub")?.children).toHaveLength(3); // new file shown
  });

  test("a folder that disappeared is not resurrected", () => {
    s().setChildren("/w/sub", [file("/w/sub/a.ts")]);
    const sub = s().tree.find((n) => n.path === "/w/sub");
    expect(sub?.children?.some((n) => n.path === "/w/sub/deep")).toBe(false);
  });
});
