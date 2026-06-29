import type { Extension, ExtensionContext, SettingsSchema } from "@jelly/sdk";

export const ALL_TOOLS = [
  "list_notes",
  "get_note",
  "create_note",
  "update_note",
  "delete_note",
] as const;

const SCHEMA: SettingsSchema = {
  "mcp.enabled": { type: "boolean", default: false, description: "Run a local MCP server for LLM tool access." },
  "mcp.port": { type: "number", default: 3282, description: "Port the MCP HTTP server listens on." },
  "mcp.allowedTools": { type: "object", default: [...ALL_TOOLS], description: "Tools exposed via MCP." },
};

export const mcpExtension: Extension = {
  manifest: {
    id: "jelly.mcp",
    name: "MCP Server",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "mcp.start", title: "Start MCP Server" },
        { id: "mcp.stop", title: "Stop MCP Server" },
      ],
      settings: SCHEMA,
    },
  },

  activate(ctx: ExtensionContext) {
    ctx.settings.defineSchema(SCHEMA);

    function port() {
      return ctx.settings.get<number>("mcp.port") ?? 3282;
    }

    function allowedTools() {
      return ctx.settings.get<string[]>("mcp.allowedTools") ?? [...ALL_TOOLS];
    }

    async function start() {
      try {
        await ctx.ipc.mcp.start(port(), allowedTools());
      } catch (err) {
        ctx.notifications.error(`Failed to start MCP server: ${err instanceof Error ? err.message : String(err)}`, {
          source: "MCP",
        });
      }
    }

    async function stop() {
      try {
        await ctx.ipc.mcp.stop();
      } catch (err) {
        ctx.notifications.error(`Failed to stop MCP server: ${err instanceof Error ? err.message : String(err)}`, {
          source: "MCP",
        });
      }
    }

    ctx.subscriptions.push(
      ctx.commands.register("mcp.start", start),
      ctx.commands.register("mcp.stop", stop),
      ctx.settings.onChange("mcp.enabled", (enabled) => {
        void (enabled ? start() : stop());
      }),
      ctx.settings.onChange("mcp.port", () => {
        if (ctx.settings.get<boolean>("mcp.enabled")) void start();
      }),
      ctx.settings.onChange("mcp.allowedTools", (tools) => {
        void ctx.ipc.mcp.updateTools((tools as string[]) ?? []).catch((err) => {
          ctx.notifications.error(`Failed to update MCP tools: ${err instanceof Error ? err.message : String(err)}`, {
            source: "MCP",
          });
        });
      }),
    );

    if (ctx.settings.get<boolean>("mcp.enabled")) {
      void start();
    }
  },
};
