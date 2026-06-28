import type { ExtensionContext } from "@jelly/sdk";
import { baseExtensions, useSetting } from "@jelly/ui";
import { search, searchKeymap } from "@codemirror/search";
import { EditorView, keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef } from "react";
import { FindPanel } from "./FindPanel";
import { useState } from "react";
import { getActiveView, setActiveView } from "../active-view";

interface Props {
  ctx: ExtensionContext;
  name: string;
  value: string;
  theme: "dark" | "light";
  isLargeFile: boolean;
  /** 1-based line to scroll to and select, e.g. from a search result */
  revealLine?: number;
  /** bumped each time a reveal is requested, so re-revealing the same line works */
  revealNonce?: number;
  onChange: (value: string) => void;
}

/** Scroll `line` (1-based) into view and place the cursor at its start. */
function revealLineInView(view: EditorView, line: number) {
  const clamped = Math.max(1, Math.min(line, view.state.doc.lines));
  const pos = view.state.doc.line(clamped).from;
  view.dispatch({
    selection: { anchor: pos },
    effects: EditorView.scrollIntoView(pos, { y: "center" }),
  });
  view.focus();
}

export function CodeEditor({
  ctx,
  name,
  value,
  theme,
  isLargeFile,
  revealLine,
  revealNonce,
  onChange,
}: Props) {
  const dark = theme !== "light";
  const fontSize = useSetting(ctx, "editor.fontSize", 13);
  const tabSize = useSetting(ctx, "editor.tabSize", 2);
  const wordWrap = useSetting(ctx, "editor.wordWrap", false);
  const viewRef = useRef<EditorView | null>(null);
  const [findOpen, setFindOpen] = useState(false);

  // Apply reveal requests once the view exists (covers both an already-open
  // file and one that just mounted after loading).
  useEffect(() => {
    if (revealLine !== undefined && viewRef.current) {
      revealLineInView(viewRef.current, revealLine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealNonce]);

  // Keep the shared active-view pointer in sync so fold commands (run from the
  // global keybinding dispatcher) act on the currently mounted editor.
  useEffect(() => {
    return () => {
      if (viewRef.current && getActiveView() === viewRef.current) setActiveView(null);
    };
  }, []);

  const extensions = useMemo(
    () => [
      ...baseExtensions(name, dark, { fontSize, tabSize, wordWrap, largeFile: isLargeFile }),
      search({ top: true }),
      keymap.of(
        searchKeymap.filter(
          (b) => b.key !== "Mod-f" && b.key !== "Escape",
        ),
      ),
      keymap.of([
        {
          key: "Mod-f",
          run: () => {
            setFindOpen(true);
            return true;
          },
        },
      ]),
    ],
    [dark, name, fontSize, tabSize, wordWrap, isLargeFile],
  );

  return (
    <div className="relative h-full">
      {findOpen && viewRef.current && (
        <FindPanel view={viewRef.current} onClose={() => setFindOpen(false)} />
      )}
      <CodeMirror
        value={value}
        onChange={onChange}
        theme="none"
        height="100%"
        style={{ height: "100%" }}
        extensions={extensions}
        onCreateEditor={(view) => {
          viewRef.current = view;
          setActiveView(view);
          if (revealLine !== undefined) revealLineInView(view, revealLine);
        }}
        basicSetup={{
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          lintKeymap: false,
          searchKeymap: false,
        }}
      />
    </div>
  );
}
