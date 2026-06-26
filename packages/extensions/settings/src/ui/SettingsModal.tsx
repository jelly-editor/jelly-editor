import type { ExtensionContext } from "@jelly/sdk";
import { useSetting } from "@jelly/ui";
import { useEffect } from "react";
import { useSettingsUi } from "../store";

/** Centered settings dialog. Opened with ⌘, — closed on Esc or backdrop click.
 *  Reads and writes the shared kernel settings via ctx. */
export function SettingsModal({ ctx }: { ctx: ExtensionContext }) {
  const open = useSettingsUi((s) => s.open);
  const setOpen = useSettingsUi((s) => s.setOpen);

  const theme = useSetting(ctx, "ui.theme", "dark");
  const fontSize = useSetting(ctx, "editor.fontSize", 13);
  const tabSize = useSetting(ctx, "editor.tabSize", 2);
  const wordWrap = useSetting(ctx, "editor.wordWrap", false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const set = <T,>(key: string, value: T) => ctx.settings.set(key, value);

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 animate-[fadeIn_80ms_ease]"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex flex-col w-[380px] bg-bg-elevated border border-border rounded-[10px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-[44px] border-b border-border shrink-0">
          <span className="text-[13px] font-semibold text-text">Settings</span>
          <button
            className="flex items-center justify-center w-[20px] h-[20px] rounded-[4px] text-text-muted text-[15px] leading-none hover:bg-bg-active hover:text-text"
            onClick={() => setOpen(false)}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col p-5 gap-1">
          <Row label="Theme">
            <Segmented
              value={theme}
              options={[
                { label: "Dark", value: "dark" },
                { label: "Light", value: "light" },
              ]}
              onChange={(v) => set("ui.theme", v)}
            />
          </Row>

          <Row label="Font Size">
            <Stepper value={fontSize} min={8} max={32} suffix="px" onChange={(n) => set("editor.fontSize", n)} />
          </Row>

          <Row label="Tab Size">
            <Segmented
              value={String(tabSize)}
              options={[
                { label: "2", value: "2" },
                { label: "4", value: "4" },
                { label: "8", value: "8" },
              ]}
              onChange={(v) => set("editor.tabSize", Number(v))}
            />
          </Row>

          <Row label="Word Wrap">
            <Toggle value={wordWrap} onChange={(v) => set("editor.wordWrap", v)} />
          </Row>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between h-[36px]">
      <span className="text-[12px] text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-[2px] p-[2px] bg-bg rounded-[6px] border border-border">
      {options.map((o) => (
        <button
          key={o.value}
          className={`px-[10px] h-[22px] rounded-[4px] text-[11px] cursor-pointer ${
            value === o.value
              ? "bg-accent text-accent-fg font-medium"
              : "text-text-muted hover:text-text"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center gap-[2px] p-[2px] bg-bg rounded-[6px] border border-border">
      <button
        className="flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-text-muted text-[13px] leading-none cursor-pointer hover:bg-bg-active hover:text-text disabled:opacity-40 disabled:cursor-default"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
      >
        −
      </button>
      <span className="w-[40px] text-center text-[11px] text-text tabular-nums">
        {value}
        {suffix}
      </span>
      <button
        className="flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-text-muted text-[13px] leading-none cursor-pointer hover:bg-bg-active hover:text-text disabled:opacity-40 disabled:cursor-default"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`relative w-[36px] h-[20px] rounded-full cursor-pointer transition-colors ${
        value ? "bg-accent" : "bg-bg-active"
      }`}
      onClick={() => onChange(!value)}
    >
      <span
        className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white transition-all ${
          value ? "left-[18px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}
