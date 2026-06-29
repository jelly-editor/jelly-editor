import type { ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "../store";

export function WorkspaceTitle({ ctx }: { ctx: ExtensionContext }) {
  const path = useWorkspaceStore((s) => s.path);
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const name = path ? path.split("/").pop() : null;
  if (!name) return null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (!open) ipc.workspace.recent().then((r) => setRecents(r.filter((f) => f !== path).slice(0, 3))).catch(() => {});
    setOpen((v) => !v);
  };

  const folderName = (p: string) => p.split("/").pop() ?? p;
  const formatPath = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");

  return (
    <div ref={rootRef} className="relative [-webkit-app-region:no-drag]">
      <button
        className="flex items-center gap-[5px] px-[8px] h-[24px] text-[12px] font-medium text-text-muted hover:text-text rounded-[4px] hover:bg-bg-active transition-colors duration-[80ms] cursor-pointer"
        onClick={handleOpen}
      >
        {name}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="mt-px shrink-0 opacity-60">
          <path d="M4 6L1 2.5h6L4 6z" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 min-w-[200px] bg-bg-elevated border border-border rounded-[6px] shadow-lg z-[200] py-[4px]">
          {recents.length > 0 && (
            <>
              <div className="px-[12px] h-[22px] flex items-center text-[10px] font-semibold text-text-dim uppercase tracking-[0.08em]">
                Recent
              </div>
              {recents.map((folder) => (
                <button
                  key={folder}
                  className="w-full flex flex-col items-start px-[12px] py-[5px] hover:bg-bg-hover cursor-pointer transition-colors duration-[80ms]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    void ctx.commands.execute("workspace.open", folder);
                  }}
                >
                  <span className="text-[12px] text-text">{folderName(folder)}</span>
                  <span className="text-[10px] text-text-dim">{formatPath(folder)}</span>
                </button>
              ))}
              <div className="my-[4px] border-t border-border" />
            </>
          )}
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
