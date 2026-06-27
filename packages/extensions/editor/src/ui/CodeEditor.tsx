import type { ExtensionContext } from "@jelly/sdk";
import { baseExtensions, useSetting } from "@jelly/ui";
import { search, searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo, useRef } from "react";
import { FindPanel } from "./FindPanel";
import { useState } from "react";

interface Props {
  ctx: ExtensionContext;
  name: string;
  value: string;
  theme: "dark" | "light";
  isLargeFile: boolean;
  onChange: (value: string) => void;
}

export function CodeEditor({ ctx, name, value, theme, isLargeFile, onChange }: Props) {
  const dark = theme !== "light";
  const fontSize = useSetting(ctx, "editor.fontSize", 13);
  const tabSize = useSetting(ctx, "editor.tabSize", 2);
  const wordWrap = useSetting(ctx, "editor.wordWrap", false);
  const viewRef = useRef<EditorView | null>(null);
  const [findOpen, setFindOpen] = useState(false);

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
        onCreateEditor={(view) => { viewRef.current = view; }}
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
