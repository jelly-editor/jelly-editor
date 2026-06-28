import type { ExtensionContext } from "@jelly/sdk";
import { useSettingsUi } from "./store";

export async function checkForSettingsUpdate(
  ctx: ExtensionContext,
  opts: { silent?: boolean } = {},
) {
  const store = useSettingsUi.getState();
  if (!opts.silent) store.setChecking();

  try {
    const result = await ctx.ipc.updater.check();
    useSettingsUi.getState().setUpdateResult(result);
    return result;
  } catch (err) {
    if (!opts.silent) useSettingsUi.getState().setUpdateError(err);
    throw err;
  }
}

export async function installAndRestart(ctx: ExtensionContext) {
  useSettingsUi.getState().setInstalling();

  try {
    await ctx.ipc.updater.installAndRestart();
  } catch (err) {
    useSettingsUi.getState().setUpdateError(err);
    throw err;
  }
}

export function openAboutAndCheck(ctx: ExtensionContext) {
  const store = useSettingsUi.getState();
  store.setTab("about");
  store.setOpen(true);
  void checkForSettingsUpdate(ctx).catch(() => undefined);
}
