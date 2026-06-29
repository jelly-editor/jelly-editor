import type { Extension, ExtensionContext, SettingsSchema } from "@jelly/sdk";
import { capture, initAnalytics, optIn, optOut } from "./analytics";

const SCHEMA: SettingsSchema = {
  "telemetry.enabled": {
    type: "boolean",
    default: true,
    description: "Send anonymous usage events to help improve Jelly. No file names, paths, or content are ever collected.",
  },
};

let terminalSessionSeen = false;

export const telemetryExtension: Extension = {
  manifest: {
    id: "jelly.telemetry",
    name: "Telemetry",
    version: "1.0.0",
    contributes: {
      settings: SCHEMA,
    },
  },

  activate(ctx: ExtensionContext) {
    ctx.settings.defineSchema(SCHEMA);

    const enabled = ctx.settings.get<boolean>("telemetry.enabled") ?? true;
    initAnalytics(enabled);

    ctx.subscriptions.push(
      ctx.settings.onChange("telemetry.enabled", (val) => {
        if (val) optIn();
        else optOut();
      }),
    );

    capture("app_launched");

    ctx.subscriptions.push(
      ctx.events.on("workspace:opened", () => capture("workspace_opened")),

      ctx.events.on("editor:active_changed", ({ path }: { path: string | null }) => {
        if (path) capture("file_opened");
      }),

      ctx.events.on("terminal:output", () => {
        if (!terminalSessionSeen) {
          terminalSessionSeen = true;
          capture("terminal_opened");
        }
      }),

      ctx.events.on("terminal:exit", () => {
        terminalSessionSeen = false;
        capture("terminal_session_ended");
      }),

      ctx.events.on("search:done", ({ capped }: { searchId: string; capped: boolean }) => {
        capture("search_performed", { capped });
      }),

      ctx.events.on("notes:create_requested", () => capture("note_created")),

      ctx.events.on("settings:opened", () => capture("settings_opened")),

      ctx.events.on("theme:changed", ({ theme }: { theme: string }) =>
        capture("theme_changed", { theme }),
      ),

      ctx.events.on("git:panel_viewed", () => capture("git_panel_viewed")),
    );
  },
};
