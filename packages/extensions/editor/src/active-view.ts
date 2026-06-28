import type { EditorView } from "@codemirror/view";

// The editor mounts a single CodeMirror view at a time (one per active tab).
// We track it here so command handlers — which run from the centralized
// keybinding dispatcher, outside React — can act on the live view (e.g. fold).
let active: EditorView | null = null;

export function setActiveView(view: EditorView | null): void {
  active = view;
}

export function getActiveView(): EditorView | null {
  return active;
}
