import type { Extension } from "@jelly/sdk";
import { describe, expect, test } from "bun:test";
import { Kernel } from "../core/kernel";

/** A trivial extension that mounts "hello" into the sidebar panel slot. */
function helloExtension(activations: { count: number }): Extension {
  return {
    manifest: { id: "test.hello", name: "Hello", version: "1.0.0" },
    activate(ctx) {
      activations.count++;
      ctx.commands.register("hello.say", () => "hello");
      ctx.ui.contributeSidebarPanel({ id: "hello", render: () => "hello" });
    },
  };
}

describe("Kernel lifecycle", () => {
  test("loads and activates a trivial extension that mounts into a slot", async () => {
    const kernel = new Kernel();
    const activations = { count: 0 };

    await kernel.loadAll([helloExtension(activations)]);

    expect(kernel.isActive("test.hello")).toBe(true);
    const panels = kernel.slots.get("sidebar.panel");
    expect(panels).toHaveLength(1);
    expect(panels[0]!.render()).toBe("hello");
    expect(await kernel.commands.execute<string>("hello.say")).toBe("hello");
  });

  test("double-activate is a guarded no-op", async () => {
    const kernel = new Kernel();
    const activations = { count: 0 };
    kernel.load(helloExtension(activations));

    await kernel.activate("test.hello");
    await kernel.activate("test.hello");

    expect(activations.count).toBe(1);
  });

  test("rejects loading the same id twice", () => {
    const kernel = new Kernel();
    kernel.load(helloExtension({ count: 0 }));
    expect(() => kernel.load(helloExtension({ count: 0 }))).toThrow(/already loaded/);
  });

  test("deactivate disposes everything the extension registered", async () => {
    const kernel = new Kernel();
    await kernel.loadAll([helloExtension({ count: 0 })]);

    await kernel.deactivate("test.hello");

    expect(kernel.isActive("test.hello")).toBe(false);
    expect(kernel.commands.has("hello.say")).toBe(false);
    expect(kernel.slots.get("sidebar.panel")).toHaveLength(0);
  });

  test("can re-activate after deactivate", async () => {
    const kernel = new Kernel();
    const activations = { count: 0 };
    kernel.load(helloExtension(activations));

    await kernel.activate("test.hello");
    await kernel.deactivate("test.hello");
    await kernel.activate("test.hello");

    expect(activations.count).toBe(2);
    expect(kernel.slots.get("sidebar.panel")).toHaveLength(1);
  });
});
