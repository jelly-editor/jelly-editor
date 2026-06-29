import { onFullscreenChange } from "@jelly/ipc";
import type { ExtensionContext } from "@jelly/sdk";
import { ContextMenu, useContextMenu } from "@jelly/ui";
import { useEffect } from "react";
import { useWorkspaceStore } from "../store";

export function FolderSwitcher({ ctx }: { ctx: ExtensionContext }) {
  const folders = useWorkspaceStore((s) => s.folders);
  const activePath = useWorkspaceStore((s) => s.path);
  const menu = useContextMenu<string>();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onFullscreenChange((fs) => {
      document.documentElement.style.setProperty("--folder-switcher-left", fs ? "8px" : "76px");
    }).then((un) => (unlisten = un));
    return () => {
      unlisten?.();
      document.documentElement.style.removeProperty("--folder-switcher-left");
    };
  }, []);

  if (folders.length <= 1) return null;

  return (
    <div className="flex items-center gap-[4px] px-[4px]">
      {folders.map((folderPath) => {
        const name = folderPath.split("/").pop() ?? "";
        const initials = name.slice(0, 2).toUpperCase();
        const isActive = folderPath === activePath;
        return (
          <button
            key={folderPath}
            className={`flex items-center justify-center w-[26px] h-[26px] rounded-full text-[10px] font-semibold cursor-pointer transition-colors duration-[80ms] select-none ${
              isActive ? "bg-accent text-accent-fg" : "bg-bg-active text-text-muted hover:text-text"
            }`}
            onClick={() => void ctx.commands.execute("workspace.switchFolder", folderPath)}
            onContextMenu={(e) => menu.open(e, folderPath)}
            title={folderPath}
          >
            {initials}
          </button>
        );
      })}
      {menu.state && (
        <ContextMenu
          x={menu.state.x}
          y={menu.state.y}
          onClose={menu.close}
          items={[
            {
              label: "Remove from workspace",
              onSelect: () => void ctx.commands.execute("workspace.removeFolder", menu.state!.data),
            },
          ]}
        />
      )}
    </div>
  );
}
