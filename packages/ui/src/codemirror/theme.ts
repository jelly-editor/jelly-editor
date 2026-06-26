// Shared CodeMirror configuration used by both the editor and the git diff
// view: theme-aware token colors and the editor chrome.
import { EditorView } from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting, indentUnit } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { languageFor } from "./languages";

// Token colors reference CSS variables, so they follow the active light/dark
// theme automatically (see @jelly/ui theme.css).
export const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: "var(--color-syntax-keyword)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--color-syntax-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--color-syntax-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--color-syntax-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: "var(--color-syntax-function)" },
  { tag: [t.variableName, t.propertyName], color: "var(--color-syntax-variable)" },
  { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName)], color: "var(--color-syntax-type)" },
  { tag: [t.operator, t.punctuation, t.bracket, t.separator], color: "var(--color-syntax-punct)" },
  { tag: [t.tagName, t.angleBracket], color: "var(--color-syntax-tag)" },
  { tag: [t.attributeName, t.propertyName], color: "var(--color-syntax-attr)" },
  { tag: [t.heading, t.strong], color: "var(--color-syntax-keyword)", fontWeight: "600" },
  { tag: [t.link, t.url], color: "var(--color-syntax-function)", textDecoration: "underline" },
  { tag: t.invalid, color: "var(--color-danger)" },
]);

export function jellyTheme(dark: boolean, fontSize = 13): Extension {
  return EditorView.theme(
    {
      "&": {
        color: "var(--color-text)",
        backgroundColor: "transparent",
        fontSize: `${fontSize}px`,
        height: "100%",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-mono)",
        lineHeight: "1.6",
        overflow: "auto",
      },
      ".cm-content": { padding: "8px 0", caretColor: "var(--color-text)" },
      ".cm-gutters": {
        backgroundColor: "transparent",
        color: "var(--color-text-dim)",
        border: "none",
      },
      ".cm-activeLine": { backgroundColor: "color-mix(in oklch, var(--color-bg-elevated) 55%, transparent)" },
      ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--color-text-muted)" },
      "&.cm-focused .cm-cursor": { borderLeftColor: "var(--color-text)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: "var(--color-accent-dim)" },
      ".cm-selectionMatch": { backgroundColor: "var(--color-bg-active)" },
      "&.cm-focused .cm-matchingBracket": {
        backgroundColor: "var(--color-bg-active)",
        outline: "none",
      },
      ".cm-foldPlaceholder": {
        backgroundColor: "var(--color-bg-active)",
        border: "none",
        color: "var(--color-text-muted)",
      },
    },
    { dark }
  );
}

export interface EditorOptions {
  fontSize?: number;
  tabSize?: number;
  wordWrap?: boolean;
}

/** Theme + syntax highlighting + language, shared by editor and diff views. */
export function baseExtensions(name: string, dark: boolean, opts: EditorOptions = {}): Extension[] {
  const { fontSize = 13, tabSize = 2, wordWrap = false } = opts;
  const exts: Extension[] = [
    jellyTheme(dark, fontSize),
    syntaxHighlighting(highlightStyle),
    EditorState.tabSize.of(tabSize),
    indentUnit.of(" ".repeat(tabSize)),
    ...languageFor(name),
  ];
  if (wordWrap) exts.push(EditorView.lineWrapping);
  return exts;
}
