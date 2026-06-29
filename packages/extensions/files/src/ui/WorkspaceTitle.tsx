import type { ExtensionContext } from "@jelly/sdk";
import { useState } from "react";
import { useWorkspaceStore } from "../store";

export function WorkspaceTitle({ ctx }: { ctx: ExtensionContext }) {
  const path = useWorkspaceStore((s) => s.path);
  const [open, setOpen] = useState(false);
  const name = path ? path.split("/").pop() : null;
  if (!name) return null;

  return (
    <div className="relative [-webkit-app-region:no-drag]">
      <button
        className="flex items-center gap-[4px] px-[8px] h-[24px] text-[12px] font-medium text-text-muted hover:text-text rounded-[4px] hover:bg-bg-active transition-colors duration-[80ms] cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        {name}
        <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
          <path d="M4 5L0 0h8L4 5z" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 min-w-[190px] bg-bg-elevated border border-border rounded-[6px] shadow-lg z-[200] py-[4px]">
          <button
            className="w-full flex items-center px-[12px] h-[28px] text-[12px] text-text hover:bg-bg-hover cursor-pointer text-left transition-colors duration-[80ms]"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              void ctx.commands.execute("workspace.addFolder");
            }}
          >
            Add folder to workspace
          </button>
        </div>
      )}
    </div>
  );
}
