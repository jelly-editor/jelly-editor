import { useEditorStore } from "../store";

/** Active file path (last two segments), shown on the left of the status bar. */
export function EditorPath() {
  const activeTabPath = useEditorStore((s) => s.activeTabPath);
  const relativePath = activeTabPath ? activeTabPath.split("/").slice(-2).join("/") : null;
  if (!relativePath) return null;
  return <span className="text-text-dim">{relativePath}</span>;
}

export function EditorEncoding() {
  return <span>UTF-8</span>;
}

export function EditorIndent() {
  return <span>Spaces: 2</span>;
}
