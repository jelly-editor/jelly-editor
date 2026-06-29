import type { ExtensionContext, McpToolInfo } from "@jelly/sdk";
import { useSetting } from "@jelly/ui";
import { useEffect, useState } from "react";
import { Row, Toggle } from "../controls";

const TOOL_GROUPS = [
  {
    id: "notes",
    label: "Notes",
    tools: [
      { id: "list_notes", label: "List notes", description: "List notes for a cwd" },
      { id: "get_note", label: "Get note", description: "Read note content by file path" },
      { id: "create_note", label: "Create note", description: "Create a new note for a cwd" },
      { id: "update_note", label: "Update note", description: "Update note content or title" },
      { id: "delete_note", label: "Delete note", description: "Permanently delete a note" },
    ],
  },
] as const;

const ALL_TOOL_IDS = TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.id));
const FALLBACK_TOOLS: McpToolInfo[] = TOOL_GROUPS.flatMap((group) =>
  group.tools.map((tool) => ({
    name: tool.id,
    label: tool.label,
    description: tool.description,
    group: group.label,
  })),
);

type McpStatus = "unknown" | "running" | "stopped" | "error";

export function MCPTab({ ctx }: { ctx: ExtensionContext }) {
  const enabled = useSetting(ctx, "mcp.enabled", false);
  const port = useSetting(ctx, "mcp.port", 3282);
  const allowedTools = useSetting<string[]>(ctx, "mcp.allowedTools", ALL_TOOL_IDS);
  const [copied, setCopied] = useState(false);
  const [copiedClaude, setCopiedClaude] = useState(false);
  const [copiedCodex, setCopiedCodex] = useState(false);
  const [status, setStatus] = useState<McpStatus>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<McpToolInfo[]>(FALLBACK_TOOLS);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  const set = <T,>(key: string, value: T) => ctx.settings.set(key, value);

  const url = `http://localhost:${port}/mcp`;
  const claudeCommand = `claude mcp add --transport http "Jelly" ${url}`;
  const codexCommand = `codex mcp add Jelly -- npx -y mcp-remote ${url} --allow-http --transport http-only`;

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const current = await ctx.ipc.mcp.status();
        if (cancelled) return;
        setStatus(current.running ? "running" : "stopped");
        setError(current.error ?? null);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    void refresh();
    const id = window.setInterval(refresh, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, port]);

  useEffect(() => {
    let cancelled = false;
    async function loadTools() {
      try {
        const available = await ctx.ipc.mcp.tools();
        if (!cancelled && available.length > 0) setTools(available);
      } catch {
        if (!cancelled) setTools(FALLBACK_TOOLS);
      }
    }
    void loadTools();
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  const groups = groupTools(tools);
  const displayStatus = enabled ? status : "stopped";

  function isToolAllowed(id: string) {
    return allowedTools.includes(id);
  }

  function isGroupAllowed(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return false;
    return group.tools.every((t) => allowedTools.includes(t.name));
  }

  function isGroupPartial(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return false;
    const allowed = group.tools.filter((t) => allowedTools.includes(t.name));
    return allowed.length > 0 && allowed.length < group.tools.length;
  }

  function toggleGroup(groupId: string) {
    if (!enabled) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const groupToolIds = group.tools.map((t) => t.name);
    if (isGroupAllowed(groupId)) {
      set("mcp.allowedTools", allowedTools.filter((id) => !groupToolIds.includes(id)));
    } else {
      const merged = [...new Set([...allowedTools, ...groupToolIds])];
      set("mcp.allowedTools", merged);
    }
  }

  function toggleGroupCollapsed(groupId: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function toggleTool(toolId: string) {
    if (!enabled) return;
    if (allowedTools.includes(toolId)) {
      set("mcp.allowedTools", allowedTools.filter((id) => id !== toolId));
    } else {
      set("mcp.allowedTools", [...allowedTools, toolId]);
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyClaudeCommand() {
    await navigator.clipboard.writeText(claudeCommand);
    setCopiedClaude(true);
    setTimeout(() => setCopiedClaude(false), 1500);
  }

  async function copyCodexCommand() {
    await navigator.clipboard.writeText(codexCommand);
    setCopiedCodex(true);
    setTimeout(() => setCopiedCodex(false), 1500);
  }

  return (
    <div className="flex flex-col p-5 gap-4 overflow-y-auto">
      <div className="flex flex-col gap-1">
        <Row label="Enable MCP Server">
          <Toggle value={enabled} onChange={(v) => set("mcp.enabled", v)} />
        </Row>
        <Row label="Status">
          <span
            className={`text-[12px] ${
              displayStatus === "running"
                ? "text-green-500"
                : displayStatus === "error"
                  ? "text-red-500"
                  : "text-text-muted"
            }`}
          >
            {displayStatus === "unknown" ? "Checking" : displayStatus}
          </span>
        </Row>
        <Row label="Port">
          <input
            type="number"
            min={1024}
            max={65535}
            value={port}
            onChange={(e) => set("mcp.port", Number(e.target.value))}
            className="w-[80px] h-[26px] px-2 rounded-[5px] border border-border bg-bg text-[12px] text-text text-right focus:outline-none focus:border-accent"
          />
        </Row>
      </div>

      <div className="rounded-[7px] border border-border bg-bg p-3 flex flex-col gap-1.5">
        <div className="text-[11px] text-text-muted">Connection URL</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] text-text font-mono truncate">{url}</code>
          <button
            className="h-[22px] px-2 rounded-[4px] border border-border text-[11px] text-text-muted hover:text-text hover:bg-bg-active shrink-0"
            onClick={copyUrl}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[11px] text-text-muted uppercase tracking-wide">Snippets</div>
        <div className="rounded-[7px] border border-border bg-bg p-3 flex flex-col gap-1.5">
          <div className="text-[11px] text-text-muted">Claude Code</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] text-text font-mono truncate">{claudeCommand}</code>
            <button
              className="h-[22px] px-2 rounded-[4px] border border-border text-[11px] text-text-muted hover:text-text hover:bg-bg-active shrink-0"
              onClick={copyClaudeCommand}
            >
              {copiedClaude ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="text-[11px] text-text-muted mt-2">Codex</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] text-text font-mono truncate">{codexCommand}</code>
            <button
              className="h-[22px] px-2 rounded-[4px] border border-border text-[11px] text-text-muted hover:text-text hover:bg-bg-active shrink-0"
              onClick={copyCodexCommand}
            >
              {copiedCodex ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[7px] border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-500">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-[11px] text-text-muted uppercase tracking-wide">Tools</div>
        {groups.map((group) => {
          const collapsed = collapsedGroups.has(group.id);
          return (
            <div key={group.id} className="rounded-[7px] border border-border overflow-hidden">
              <button
                className="w-full flex items-center gap-2.5 px-3 h-[34px] bg-bg hover:bg-bg-active text-left"
                onClick={() => toggleGroupCollapsed(group.id)}
              >
                <Chevron expanded={!collapsed} />
                <span
                  role="checkbox"
                  aria-checked={isGroupPartial(group.id) ? "mixed" : isGroupAllowed(group.id)}
                  aria-disabled={!enabled}
                  tabIndex={enabled ? 0 : -1}
                  className={!enabled ? "opacity-50 cursor-default" : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(group.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== " " && e.key !== "Enter") return;
                    e.preventDefault();
                    e.stopPropagation();
                    toggleGroup(group.id);
                  }}
                >
                  <Checkbox checked={isGroupAllowed(group.id)} partial={isGroupPartial(group.id)} />
                </span>
                <span className="text-[12px] font-medium text-text flex-1">{group.label}</span>
                <span className="text-[11px] text-text-muted/60">{group.tools.length}</span>
              </button>
              {!collapsed && (
                <div className="border-t border-border">
                  {group.tools.map((tool, i) => (
                    <button
                      key={tool.name}
                      className={`w-full flex items-center gap-2.5 px-3 h-[32px] hover:bg-bg-active text-left disabled:cursor-default disabled:hover:bg-transparent ${
                        i < group.tools.length - 1 ? "border-b border-border/50" : ""
                      }`}
                      disabled={!enabled}
                      onClick={() => toggleTool(tool.name)}
                    >
                      <Checkbox checked={isToolAllowed(tool.name)} />
                      <span className="text-[12px] text-text-muted flex-1">{tool.label}</span>
                      <span className="text-[11px] text-text-muted/50">{tool.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function groupTools(tools: McpToolInfo[]) {
  const map = new Map<string, { id: string; label: string; tools: McpToolInfo[] }>();
  for (const tool of tools) {
    const label = tool.group || "Other";
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const group = map.get(id) ?? { id, label, tools: [] };
    group.tools.push(tool);
    map.set(id, group);
  }
  return [...map.values()];
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-[12px] h-[12px] text-text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Checkbox({ checked, partial = false }: { checked: boolean; partial?: boolean }) {
  return (
    <div
      className={`w-[13px] h-[13px] rounded-[3px] border shrink-0 flex items-center justify-center ${
        checked || partial ? "bg-accent border-accent" : "border-border bg-bg"
      }`}
    >
      {partial ? (
        <div className="w-[6px] h-[1.5px] bg-white rounded-full" />
      ) : checked ? (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}
