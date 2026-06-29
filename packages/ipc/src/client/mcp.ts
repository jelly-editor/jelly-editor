import { invoke } from "@tauri-apps/api/core";
import type { McpClient, McpStatus, McpToolInfo } from "@jelly/sdk";

export const mcp: McpClient = {
  start: (port, allowedTools) => invoke<void>("mcp_start", { port, allowedTools }),
  stop: () => invoke<void>("mcp_stop"),
  status: () => invoke<McpStatus>("mcp_status"),
  tools: () => invoke<McpToolInfo[]>("mcp_tools"),
  updateTools: (tools) => invoke<void>("mcp_update_tools", { tools }),
};
