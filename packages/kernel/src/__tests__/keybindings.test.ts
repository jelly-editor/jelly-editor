import { describe, expect, test } from "bun:test";
import { CommandBus } from "../registries/commands";
import { ContextKeyStore } from "../registries/context-keys";
import { KeybindingStore } from "../registries/keybindings";
import { KeyDispatcher } from "../core/key-dispatch";
import { isMac } from "../registries/keys";

/** Fire `mod+<key>` using whichever physical modifier this OS maps `mod` to. */
const mod = (key: string) => (isMac ? { metaKey: true, key } : { ctrlKey: true, key });

function ev(init: Partial<KeyboardEvent>): KeyboardEvent & { defaultPrevented: boolean } {
  let prevented = false;
  return {
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    key: "",
    ...init,
    preventDefault() {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  } as KeyboardEvent & { defaultPrevented: boolean };
}

/** A fake window that captures the keydown listener so we can fire events. */
function fakeWindow() {
  let handler: ((e: KeyboardEvent) => void) | undefined;
  const win = {
    addEventListener: (_t: string, cb: (e: KeyboardEvent) => void) => {
      handler = cb;
    },
    removeEventListener: () => {
      handler = undefined;
    },
  } as unknown as Window;
  return { win, fire: (e: KeyboardEvent) => handler?.(e) };
}

describe("KeybindingStore", () => {
  test("add → list → dispose", () => {
    const store = new KeybindingStore();
    const sub = store.add({ command: "a.b", key: "mod+k", when: "x" });
    expect(store.list()).toEqual([{ command: "a.b", key: "mod+k", when: "x" }]);
    expect(store.bindings()[0].chords).toHaveLength(1);
    sub.dispose();
    expect(store.list()).toEqual([]);
  });
});

describe("ContextKeyStore", () => {
  const ctx = new ContextKeyStore();
  ctx.set("workspaceOpen", true);
  ctx.set("terminalFocused", false);

  test("empty when is always true", () => {
    expect(ctx.evaluate(undefined)).toBe(true);
    expect(ctx.evaluate("")).toBe(true);
  });
  test("identifier, negation, && and ||", () => {
    expect(ctx.evaluate("workspaceOpen")).toBe(true);
    expect(ctx.evaluate("!terminalFocused")).toBe(true);
    expect(ctx.evaluate("workspaceOpen && terminalFocused")).toBe(false);
    expect(ctx.evaluate("terminalFocused || workspaceOpen")).toBe(true);
  });
  test("unknown keys are false", () => {
    expect(ctx.evaluate("missing")).toBe(false);
  });
});

describe("KeyDispatcher", () => {
  function setup() {
    const commands = new CommandBus();
    const keybindings = new KeybindingStore();
    const context = new ContextKeyStore();
    const fired: string[] = [];
    const dispatcher = new KeyDispatcher(keybindings, commands, context);
    const { win, fire } = fakeWindow();
    dispatcher.attach(win);
    const reg = (id: string) => commands.register(id, () => fired.push(id));
    return { commands, keybindings, context, fired, fire, reg };
  }

  test("executes the command bound to a single stroke", () => {
    const { keybindings, fired, fire, reg } = setup();
    reg("search.focus");
    keybindings.add({ command: "search.focus", key: "mod+shift+f" });

    const e = ev({ ...mod("f"), shiftKey: true });
    fire(e);

    expect(fired).toEqual(["search.focus"]);
    expect(e.defaultPrevented).toBe(true);
  });

  test("respects the when clause", () => {
    const { keybindings, context, fired, fire, reg } = setup();
    reg("editor.save");
    keybindings.add({ command: "editor.save", key: "mod+s", when: "workspaceOpen" });

    fire(ev(mod("s")));
    expect(fired).toEqual([]); // context not set yet

    context.set("workspaceOpen", true);
    fire(ev(mod("s")));
    expect(fired).toEqual(["editor.save"]);
  });

  test("completes a two-stroke chord", () => {
    const { keybindings, fired, fire, reg } = setup();
    reg("palette.shortcuts");
    keybindings.add({ command: "palette.shortcuts", key: "mod+k mod+s" });

    fire(ev(mod("k"))); // arm
    expect(fired).toEqual([]);
    fire(ev(mod("s"))); // complete
    expect(fired).toEqual(["palette.shortcuts"]);
  });

  test("a mismatched second stroke cancels the chord", () => {
    const { keybindings, fired, fire, reg } = setup();
    reg("palette.shortcuts");
    keybindings.add({ command: "palette.shortcuts", key: "mod+k mod+s" });

    fire(ev(mod("k")));
    fire(ev(mod("x"))); // not the chord's second stroke
    expect(fired).toEqual([]);
  });

  test("later binding wins a conflict", () => {
    const { keybindings, fired, fire, reg } = setup();
    reg("first");
    reg("second");
    keybindings.add({ command: "first", key: "mod+j" });
    keybindings.add({ command: "second", key: "mod+j" });

    fire(ev(mod("j")));
    expect(fired).toEqual(["second"]);
  });
});
