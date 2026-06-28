import { foldEffect, foldable, foldedRanges, unfoldEffect } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import type { EditorState, StateEffect } from "@codemirror/state";

// CodeMirror's built-in `foldCode` only folds when the cursor sits on a line
// that *starts* a foldable range. VS Code (and what users expect from ⌘⌥[)
// folds the nearest block that *encloses* the cursor. CodeMirror has this
// logic internally (`foldableContainer`) but doesn't export it, so we mirror
// it here.

/** Walk outward from `cursorLine` to the nearest foldable range spanning it. */
function enclosingFoldable(view: EditorView, cursorFrom: number) {
  let line = view.lineBlockAt(cursorFrom);
  for (;;) {
    const range = foldable(view.state, line.from, line.to);
    if (range && range.to > cursorFrom) return range;
    if (!line.from) return null;
    line = view.lineBlockAt(line.from - 1);
  }
}

/** Is `range` already collapsed? Avoids re-folding the innermost block. */
function isFolded(state: EditorState, from: number, to: number): boolean {
  let folded = false;
  foldedRanges(state).between(from, to, (f, t) => {
    if (f <= from && t >= to) folded = true;
  });
  return folded;
}

/** Fold the nearest unfolded block enclosing each cursor. */
export function foldNearest(view: EditorView): boolean {
  const effects: StateEffect<unknown>[] = [];
  for (const sel of view.state.selection.ranges) {
    let cursor = sel.head;
    // Skip blocks already folded around the cursor so repeated presses fold
    // progressively outward, like VS Code.
    for (;;) {
      const range = enclosingFoldable(view, cursor);
      if (!range) break;
      if (!isFolded(view.state, range.from, range.to)) {
        effects.push(foldEffect.of(range));
        break;
      }
      if (!range.from) break;
      cursor = range.from - 1; // look at the block one level out
    }
  }
  if (effects.length) view.dispatch({ effects });
  return effects.length > 0;
}

/** Unfold the innermost folded range at each cursor. */
export function unfoldNearest(view: EditorView): boolean {
  const effects: StateEffect<unknown>[] = [];
  const folded = foldedRanges(view.state);
  for (const sel of view.state.selection.ranges) {
    folded.between(sel.from, sel.to, (from, to) => {
      effects.push(unfoldEffect.of({ from, to }));
    });
  }
  if (effects.length) view.dispatch({ effects });
  return effects.length > 0;
}
