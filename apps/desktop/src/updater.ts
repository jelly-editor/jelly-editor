import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

/**
 * Check GitHub Releases for a newer signed build. If one is available, ask the
 * user, then download + install it and relaunch. Failures are non-fatal — a
 * broken update check must never block the editor from starting.
 *
 * Called once, fire-and-forget, after the app renders. Updater endpoints and
 * the signing pubkey live in `src-tauri/tauri.conf.json`.
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const update = await check();
    if (!update) return;

    const accepted = await ask(
      `Jelly ${update.version} is available. Download and install now?`,
      { title: "Update available", kind: "info" },
    );
    if (!accepted) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    // Offline, no release yet, or signature mismatch — log and move on.
    console.error("Update check failed:", err);
  }
}

/** Manual "Check for Updates…" entry point — surfaces an explicit result. */
export async function checkForUpdatesInteractive(): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      await message("You're on the latest version.", {
        title: "No updates",
        kind: "info",
      });
      return;
    }
    const accepted = await ask(
      `Jelly ${update.version} is available. Download and install now?`,
      { title: "Update available", kind: "info" },
    );
    if (!accepted) return;
    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    await message(`Update check failed: ${err}`, {
      title: "Update error",
      kind: "error",
    });
  }
}
