import { ipc } from "@jelly/ipc";
import { baseExtensions } from "@jelly/ui";
import { MergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

const { diff: gitDiff } = ipc.git;

/** Side-by-side diff (HEAD ↔ working tree) for a repo-relative path, rendered
 *  read-only with @codemirror/merge. */
export function DiffView({
  path,
  workspace,
  theme,
}: {
  path: string;
  workspace: string;
  theme: "dark" | "light";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let view: MergeView | null = null;
    let cancelled = false;

    (async () => {
      let original = "";
      let modified = "";
      try {
        ({ original, modified } = await gitDiff(workspace, path));
      } catch {
        /* show empty diff on error */
      }
      if (cancelled || !ref.current) return;

      const name = path.split("/").pop() ?? path;
      const readOnly = [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        lineNumbers(),
        EditorView.lineWrapping,
        ...baseExtensions(name, theme !== "light"),
      ];

      view = new MergeView({
        a: { doc: original, extensions: readOnly },
        b: { doc: modified, extensions: readOnly },
        parent: ref.current,
        highlightChanges: true,
        gutter: true,
        collapseUnchanged: { margin: 3, minSize: 4 },
      });
    })();

    return () => {
      cancelled = true;
      view?.destroy();
    };
  }, [path, theme, workspace]);

  return <div ref={ref} className="h-full overflow-auto text-[13px]" />;
}
