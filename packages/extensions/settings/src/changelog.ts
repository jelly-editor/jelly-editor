import type { ExtensionContext } from "@jelly/sdk";
import { useSettingsUi } from "./store";

const STORAGE_KEY = "lastSeenVersion";
const REPO = "jelly-editor/jelly-editor";

export async function checkChangelog(ctx: ExtensionContext, currentVersion: string): Promise<void> {
  const lastSeen = await ctx.storage.get<string>(STORAGE_KEY);

  await ctx.storage.set(STORAGE_KEY, currentVersion);

  if (!lastSeen) return; // first install — silent

  if (lastSeen === currentVersion) return;

  ctx.notifications.info(`Updated to Jelly v${currentVersion}`, {
    source: "Updates",
    actions: [
      {
        label: "What's New",
        variant: "primary",
        run: () => useSettingsUi.getState().openChangelog(currentVersion),
      },
    ],
  });
}

export async function fetchReleaseBody(version: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases/tags/v${version}`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  const data = (await res.json()) as { body?: string };
  return data.body ?? "_No release notes for this version._";
}
