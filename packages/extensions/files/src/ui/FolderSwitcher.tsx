import type { ExtensionContext } from "@jelly/sdk";
import { useWorkspaceStore } from "../store";

export function FolderSwitcher({ ctx }: { ctx: ExtensionContext }) {
  const folders = useWorkspaceStore((s) => s.folders);
  const activePath = useWorkspaceStore((s) => s.path);

  if (folders.length <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-[6px] py-[8px] px-[5px] w-[40px] bg-bg-elevated border-r border-border shrink-0">
      {folders.map((folderPath) => {
        const name = folderPath.split("/").pop() ?? "";
        const initials = name.slice(0, 2).toUpperCase();
        const isActive = folderPath === activePath;
        return (
          <button
            key={folderPath}
            className={`flex items-center justify-center w-[28px] h-[28px] rounded-full text-[10px] font-semibold cursor-pointer transition-colors duration-[80ms] select-none ${
              isActive ? "bg-accent text-accent-fg" : "bg-bg-active text-text-muted hover:text-text"
            }`}
            onClick={() => void ctx.commands.execute("workspace.switchFolder", folderPath)}
            title={folderPath}
          >
            {initials}
          </button>
        );
      })}
    </div>
  );
}
