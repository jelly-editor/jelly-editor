import type { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";

/** Pick a language extension from the file extension. Unknown types render as
 * plain text (no error, just no colors). */
export function languageFor(name: string): Extension[] {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "ts":
      return [javascript({ typescript: true })];
    case "tsx":
      return [javascript({ typescript: true, jsx: true })];
    case "jsx":
      return [javascript({ jsx: true })];
    case "js":
    case "mjs":
    case "cjs":
      return [javascript()];
    case "json":
      return [json()];
    case "rs":
      return [rust()];
    case "html":
    case "htm":
    case "vue":
    case "svelte":
      return [html()];
    case "css":
    case "scss":
    case "less":
      return [css()];
    case "md":
    case "mdx":
    case "markdown":
      return [markdown()];
    case "yml":
    case "yaml":
      return [yaml()];
    default:
      return [];
  }
}
