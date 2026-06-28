import { describe, expect, test } from "bun:test";
import { decideExternalChange } from "./reconcile";

const base = {
  isOpen: true,
  isDirty: false,
  onDisk: "new",
  saved: "old",
  alreadyNotified: false,
};

describe("decideExternalChange", () => {
  test("file not open — ignored", () => {
    expect(decideExternalChange({ ...base, isOpen: false })).toBe("ignore");
  });

  test("disk matches what we last saved — no real change, ignored", () => {
    expect(decideExternalChange({ ...base, onDisk: "old", saved: "old" })).toBe("ignore");
  });

  test("clean buffer — reloads silently", () => {
    expect(decideExternalChange({ ...base, isDirty: false })).toBe("reload");
  });

  test("unsaved edits — notifies the user", () => {
    expect(decideExternalChange({ ...base, isDirty: true })).toBe("notify");
  });

  test("unsaved edits but already notified — does not stack", () => {
    expect(decideExternalChange({ ...base, isDirty: true, alreadyNotified: true })).toBe("ignore");
  });
});
