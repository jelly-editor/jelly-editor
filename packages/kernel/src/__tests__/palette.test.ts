import { describe, expect, test } from "bun:test";
import { PaletteStore } from "../registries/palette";

describe("PaletteStore", () => {
  test("registers, lists in order, and disposes", () => {
    const store = new PaletteStore();
    const a = { id: "files", getItems: () => [] };
    const b = { id: "commands", prefix: ">", getItems: () => [] };

    const subA = store.registerProvider(a);
    store.registerProvider(b);

    expect(store.list().map((p) => p.id)).toEqual(["files", "commands"]);

    subA.dispose();
    expect(store.list().map((p) => p.id)).toEqual(["commands"]);
  });
});
