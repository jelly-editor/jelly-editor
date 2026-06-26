import type { ExtensionContext } from "@jelly/sdk";
import { baseExtensions, useSetting } from "@jelly/ui";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

interface Props {
  ctx: ExtensionContext;
  /** File name — used to pick the language for highlighting. */
  name: string;
  value: string;
  theme: "dark" | "light";
  onChange: (value: string) => void;
}

export function CodeEditor({ ctx, name, value, theme, onChange }: Props) {
  const dark = theme !== "light";
  const fontSize = useSetting(ctx, "editor.fontSize", 13);
  const tabSize = useSetting(ctx, "editor.tabSize", 2);
  const wordWrap = useSetting(ctx, "editor.wordWrap", false);
  const extensions = useMemo(
    () => baseExtensions(name, dark, { fontSize, tabSize, wordWrap }),
    [dark, name, fontSize, tabSize, wordWrap],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme="none"
      height="100%"
      style={{ height: "100%" }}
      extensions={extensions}
      basicSetup={{
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        lintKeymap: false,
        searchKeymap: true,
      }}
    />
  );
}
