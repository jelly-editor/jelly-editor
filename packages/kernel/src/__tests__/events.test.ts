import { describe, expect, test } from "bun:test";
import { Emitter } from "../registries/events";

describe("Emitter", () => {
  test("on → emit delivers the payload", () => {
    const events = new Emitter();
    const seen: number[] = [];
    events.on<number>("tick", (n) => seen.push(n));

    events.emit("tick", 1);
    events.emit("tick", 2);
    expect(seen).toEqual([1, 2]);
  });

  test("dispose stops delivery", () => {
    const events = new Emitter();
    const seen: number[] = [];
    const sub = events.on<number>("tick", (n) => seen.push(n));

    events.emit("tick", 1);
    sub.dispose();
    events.emit("tick", 2);
    expect(seen).toEqual([1]);
  });

  test("emit with no listeners is a no-op", () => {
    const events = new Emitter();
    expect(() => events.emit("nobody", {})).not.toThrow();
  });

  test("a throwing handler does not block the others", () => {
    const events = new Emitter();
    const seen: string[] = [];
    events.on("e", () => {
      throw new Error("boom");
    });
    events.on("e", () => seen.push("ok"));
    events.emit("e", null);
    expect(seen).toEqual(["ok"]);
  });
});
