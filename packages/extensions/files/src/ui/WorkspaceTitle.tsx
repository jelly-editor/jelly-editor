import { useWorkspaceStore } from "../store";

/** The workspace folder name, shown centered in the title bar. */
export function WorkspaceTitle() {
  const path = useWorkspaceStore((s) => s.path);
  const name = path ? path.split("/").pop() : null;
  if (!name) return null;
  return (
    <span
      className="text-[12px] font-medium text-text-muted pointer-events-none [-webkit-app-region:drag]"
      data-tauri-drag-region
    >
      {name}
    </span>
  );
}
