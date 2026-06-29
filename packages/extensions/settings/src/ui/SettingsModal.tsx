import type { ExtensionContext } from "@jelly/sdk";
import { useEffect } from "react";
import type { SettingsTab } from "../store";
import { useSettingsUi } from "../store";
import { AboutTab, GeneralTab, KeybindingsTab, MCPTab } from "./tabs";

const TABS: SettingsTab[] = ["general", "keybindings", "mcp", "about"];
const TAB_LABELS: Record<SettingsTab, string> = {
  general: "General",
  keybindings: "Keybindings",
  mcp: "MCP",
  about: "About",
};

/** Centered settings dialog. Opened with ⌘, — closed on Esc or backdrop click.
 *  Owns only the frame and tab routing; each tab renders its own content. */
export function SettingsModal({ ctx }: { ctx: ExtensionContext }) {
  const open = useSettingsUi((s) => s.open);
  const setOpen = useSettingsUi((s) => s.setOpen);
  const tab = useSettingsUi((s) => s.tab);
  const setTab = useSettingsUi((s) => s.setTab);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 animate-[fadeIn_80ms_ease]"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex flex-col w-[480px] h-[460px] bg-bg-elevated border border-border rounded-[10px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-[44px] border-b border-border shrink-0">
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                className={`h-[24px] px-2.5 rounded-[5px] text-[12px] ${
                  tab === t ? "bg-bg-active text-text font-medium" : "text-text-muted hover:text-text"
                }`}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <button
            className="flex items-center justify-center w-[20px] h-[20px] rounded-[4px] text-text-muted text-[15px] leading-none hover:bg-bg-active hover:text-text"
            onClick={() => setOpen(false)}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {tab === "keybindings" ? (
          <KeybindingsTab ctx={ctx} />
        ) : tab === "about" ? (
          <AboutTab ctx={ctx} />
        ) : tab === "mcp" ? (
          <MCPTab ctx={ctx} />
        ) : (
          <GeneralTab ctx={ctx} />
        )}
      </div>
    </div>
  );
}
