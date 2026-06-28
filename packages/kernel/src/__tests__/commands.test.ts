import { describe, expect, test } from "bun:test";
import { CommandBus } from "../registries/commands";

describe("CommandBus", () => {
  test("register → execute → dispose", async () => {
    const bus = new CommandBus();
    const sub = bus.register("demo.add", (a: number, b: number) => a + b);

    expect(bus.has("demo.add")).toBe(true);
    expect(await bus.execute<number>("demo.add", 2, 3)).toBe(5);

    sub.dispose();
    expect(bus.has("demo.add")).toBe(false);
    await expect(bus.execute("demo.add")).rejects.toThrow(/no command registered/);
  });

  test("awaits async handlers", async () => {
    const bus = new CommandBus();
    bus.register("demo.async", async () => "done");
    expect(await bus.execute<string>("demo.async")).toBe("done");
  });

  test("rejects duplicate registration", () => {
    const bus = new CommandBus();
    bus.register("demo.dup", () => 1);
    expect(() => bus.register("demo.dup", () => 2)).toThrow(/already registered/);
  });

  test("seedDescriptors stamps the category and list() exposes palette + category", () => {
    const bus = new CommandBus();
    bus.seedDescriptors([{ id: "git.commit", title: "Commit", palette: false }], "Git");
    expect(bus.list()).toEqual([
      { id: "git.commit", title: "Commit", palette: false, category: "Git" },
    ]);
  });

  test("an explicit descriptor category overrides the seeded one", () => {
    const bus = new CommandBus();
    bus.seedDescriptors([{ id: "x.y", title: "Y", category: "Custom" }], "X");
    expect(bus.list()[0].category).toBe("Custom");
  });

  test("dispose is idempotent and only removes its own handler", () => {
    const bus = new CommandBus();
    const first = bus.register("demo.x", () => 1);
    first.dispose();
    bus.register("demo.x", () => 2);
    first.dispose(); // second dispose must not clobber the new handler
    expect(bus.has("demo.x")).toBe(true);
  });
});
