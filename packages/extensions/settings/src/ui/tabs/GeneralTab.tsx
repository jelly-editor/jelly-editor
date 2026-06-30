import type { ExtensionContext } from "@jelly/sdk";
import { useSetting } from "@jelly/ui";
import { Row, Segmented, Stepper, Toggle } from "../controls";

/** Editor and appearance preferences. Reads and writes shared kernel settings. */
export function GeneralTab({ ctx }: { ctx: ExtensionContext }) {
  const theme = useSetting(ctx, "ui.theme", "dark");
  const sidebarPosition = useSetting<"left" | "right">(ctx, "ui.sidebarPosition", "left");
  const fontSize = useSetting(ctx, "editor.fontSize", 13);
  const tabSize = useSetting(ctx, "editor.tabSize", 2);
  const wordWrap = useSetting(ctx, "editor.wordWrap", false);
  const telemetryEnabled = useSetting(ctx, "telemetry.enabled", true);
  const hideGitIgnored = useSetting(ctx, "files.hideGitIgnored", false);

  const set = <T,>(key: string, value: T) => ctx.settings.set(key, value);

  return (
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

      <Row label="Sidebar Position">
        <Segmented
          value={sidebarPosition}
          options={[
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
          ]}
          onChange={(v) => set("ui.sidebarPosition", v)}
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

      <Row label="Hide Git Ignored Files" description="When on, gitignored files are hidden from the explorer. When off, they appear dimmed.">
        <Toggle value={hideGitIgnored} onChange={(v) => set("files.hideGitIgnored", v)} />
      </Row>

      <Row label="Send Usage Data" description="Anonymous events only — no file names, paths, or content.">
        <Toggle value={telemetryEnabled} onChange={(v) => set("telemetry.enabled", v)} />
      </Row>
    </div>
  );
}
