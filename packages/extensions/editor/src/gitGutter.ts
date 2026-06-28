import { Chunk } from "@codemirror/merge";
import { RangeSet, RangeSetBuilder, StateEffect, StateField, Text, type Extension } from "@codemirror/state";
import { EditorView, GutterMarker, gutter } from "@codemirror/view";

/** Set (or clear, with null) the HEAD baseline the gutter diffs against. */
export const setGitBaseline = StateEffect.define<string | null>();

type ChangeKind = "added" | "modified" | "deleted";

class ChangeMarker extends GutterMarker {
  constructor(readonly kind: ChangeKind) {
    super();
  }
  override elementClass = "cm-gitChange";
  override toDOM() {
    const el = document.createElement("div");
    el.className = `cm-gitChange-bar cm-gitChange-${this.kind}`;
    return el;
  }
}

function buildMarkers(baseline: string, doc: Text): RangeSet<GutterMarker> {
  const a = Text.of(baseline.split(/\r?\n/));
  const builder = new RangeSetBuilder<GutterMarker>();
  for (const chunk of Chunk.build(a, doc)) {
    if (chunk.toB === chunk.fromB) {
      const line = doc.lineAt(Math.min(chunk.fromB, doc.length));
      builder.add(line.from, line.from, new ChangeMarker("deleted"));
      continue;
    }
    const kind: ChangeKind = chunk.fromA === chunk.toA ? "added" : "modified";
    const last = doc.lineAt(Math.min(chunk.endB, doc.length)).number;
    for (let n = doc.lineAt(chunk.fromB).number; n <= last; n++) {
      const line = doc.line(n);
      builder.add(line.from, line.from, new ChangeMarker(kind));
    }
  }
  return builder.finish();
}

const gitGutterState = StateField.define<{ baseline: string | null; markers: RangeSet<GutterMarker> }>({
  create: () => ({ baseline: null, markers: RangeSet.empty }),
  update(value, tr) {
    let baseline = value.baseline;
    for (const e of tr.effects) if (e.is(setGitBaseline)) baseline = e.value;
    if (baseline === null) return { baseline: null, markers: RangeSet.empty };
    if (baseline !== value.baseline || tr.docChanged) {
      return { baseline, markers: buildMarkers(baseline, tr.state.doc) };
    }
    return value;
  },
});

const gitGutterTheme = EditorView.baseTheme({
  ".cm-gitChange": { paddingLeft: 0, paddingRight: 0 },
  ".cm-gitChange-bar": { width: "2px", height: "100%", marginLeft: "2px" },
  ".cm-gitChange-added": { background: "var(--color-success)" },
  ".cm-gitChange-modified": { background: "var(--color-accent)" },
  ".cm-gitChange-deleted": {
    width: 0,
    height: 0,
    marginLeft: "1px",
    borderLeft: "4px solid var(--color-danger)",
    borderTop: "3px solid transparent",
    borderBottom: "3px solid transparent",
  },
});

export function gitGutter(): Extension {
  return [
    gitGutterState,
    gutter({
      class: "cm-gitGutterCol",
      markers: (view) => view.state.field(gitGutterState).markers,
    }),
    gitGutterTheme,
  ];
}
