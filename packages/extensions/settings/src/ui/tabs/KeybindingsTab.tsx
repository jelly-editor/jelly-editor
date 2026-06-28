import type { ExtensionContext, KeybindingInfo } from "@jelly/sdk";
import { eventToSpec, formatKeybinding } from "@jelly/ui";
import { useMemo, useState } from "react";

/**
 * Keybindings editor: lists every command with its effective binding and lets
 * the user remap it by recording a keystroke. Overrides persist to
 * `~/.jelly/keybindings.json` via the kernel; conflicts are warned-but-allowed
 * (the dispatcher's last-wins resolves them at runtime).
 */
export function KeybindingsTab({ ctx }: { ctx: ExtensionContext }) {
  const [query, setQuery] = useState("");
  // Bump to recompute rows after a binding change (infos() is read imperatively).
  const [version, setVersion] = useState(0);
  const [recording, setRecording] = useState<string | null>(null);

  const rows = useMemo(() => {
    void version;
    const infos = new Map<string, KeybindingInfo>();
    for (const info of ctx.keybindings.infos()) infos.set(info.command, info);
    const titles = new Map(ctx.commands.list().map((c) => [c.id, c.title]));
    // Union of all commands (some may be bound but title-less, or vice-versa).
    const ids = new Set<string>([...titles.keys(), ...infos.keys()]);
    return [...ids]
      .map((command) => ({
        command,
        title: titles.get(command) ?? command,
        info: infos.get(command),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [ctx, version]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(q) || r.command.toLowerCase().includes(q));
  }, [rows, query]);

  const refresh = () => setVersion((v) => v + 1);

  const assign = (command: string, spec: string) => {
    ctx.keybindings.setUserBinding(command, spec);
    setRecording(null);
    refresh();
  };

  const reset = (command: string) => {
    ctx.keybindings.resetBinding(command);
    setRecording(null);
    refresh();
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable]">
      <div className="sticky top-0 z-10 bg-bg-elevated pt-4 pb-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commands…"
          className="w-full h-[28px] px-2.5 bg-bg border border-border rounded-[6px] text-[12px] text-text placeholder:text-text-muted outline-none focus:border-accent"
        />
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-[12px] text-text-muted">No commands found</div>
        ) : (
          filtered.map((r) => {
            const key = r.info?.key ?? "";
            const isUser = r.info?.source === "user";
            return (
              <div
                key={r.command}
                className="group flex items-center justify-between gap-3 px-3 h-[34px] rounded-[6px] hover:bg-bg-active"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] text-text truncate">{r.title}</span>
                  <span className="text-[10px] text-text-muted truncate">{r.command}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isUser && (
                    <button
                      className="text-[10px] text-text-muted hover:text-text opacity-0 group-hover:opacity-100"
                      onClick={() => reset(r.command)}
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  )}
                  {recording === r.command ? (
                    <Recorder
                      conflictFor={(spec) => conflictTitle(rows, r.command, spec)}
                      onCommit={(spec) => assign(r.command, spec)}
                      onCancel={() => setRecording(null)}
                    />
                  ) : (
                    <button
                      className={`min-w-[64px] h-[22px] px-2 rounded-[4px] border text-[11px] cursor-pointer ${
                        key
                          ? "border-border bg-bg text-text"
                          : "border-dashed border-border text-text-muted"
                      } ${isUser ? "border-accent/60" : ""} hover:border-accent`}
                      onClick={() => setRecording(r.command)}
                      title="Click to record a new shortcut"
                    >
                      {key ? formatKeybinding(key) : "Unbound"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** A focused capture box: records a chord, warns on conflict, commits on Enter. */
function Recorder({
  conflictFor,
  onCommit,
  onCancel,
}: {
  conflictFor: (spec: string) => string | null;
  onCommit: (spec: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState("");

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Swallow everything so the global key dispatcher doesn't fire while recording.
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      onCancel();
      return;
    }
    if (e.key === "Enter" && draft) {
      onCommit(draft);
      return;
    }
    const spec = eventToSpec(e.nativeEvent);
    if (spec) setDraft(spec);
  };

  const conflict = draft ? conflictFor(draft) : null;

  return (
    <div className="flex items-center gap-1.5">
      {conflict && (
        <span className="text-[10px] text-warning" title={`Currently bound to ${conflict}`}>
          ↔ {conflict}
        </span>
      )}
      <div
        tabIndex={0}
        ref={(el) => el?.focus()}
        onKeyDown={onKeyDown}
        onBlur={onCancel}
        className="min-w-[64px] h-[22px] px-2 flex items-center justify-center rounded-[4px] border border-accent bg-bg text-[11px] text-text outline-none"
      >
        {draft ? formatKeybinding(draft) : "Press keys…"}
      </div>
    </div>
  );
}

/** The display title of another command already bound to `spec`, if any. */
function conflictTitle(
  rows: { command: string; title: string; info?: KeybindingInfo }[],
  command: string,
  spec: string,
): string | null {
  const target = normalizeSpec(spec);
  for (const r of rows) {
    if (r.command === command) continue;
    if (r.info?.key && normalizeSpec(r.info.key) === target) return r.title;
  }
  return null;
}

/** Order-insensitive spec key for comparison (handles "shift+mod+f" vs "mod+shift+f"). */
function normalizeSpec(spec: string): string {
  return spec
    .trim()
    .split(/\s+/)
    .map((chord) =>
      chord
        .split("+")
        .map((t) => {
          const l = t.toLowerCase();
          if (l === "cmd" || l === "meta") return "mod";
          if (l === "control") return "ctrl";
          if (l === "option") return "alt";
          return l;
        })
        .sort()
        .join("+"),
    )
    .join(" ");
}
