import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import type { UpdaterClient } from "@jelly/sdk";

export const updater: UpdaterClient = {
  async check() {
    const currentVersion = await getVersion();
    const update = await check();

    if (!update) {
      return { currentVersion, available: false };
    }

    return {
      currentVersion,
      available: true,
      version: update.version,
      date: update.date,
      body: update.body,
    };
  },

  async installAndRestart() {
    const update = await check();
    if (!update) return;

    await update.downloadAndInstall();
    await relaunch();
  },
};
