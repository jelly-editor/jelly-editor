import type { ExtensionContext } from "@jelly/sdk";
import { useEffect, useState } from "react";
import { useSettingsUi } from "../../store";
import { checkForSettingsUpdate, installAndRestart } from "../../updater";

/** App identity and update checker: shows the current version and drives the
 *  check / install-and-restart flow against the release endpoint. */
export function AboutTab({ ctx }: { ctx: ExtensionContext }) {
  const update = useSettingsUi((s) => s.update);
  const [installError, setInstallError] = useState<string | null>(null);
  const checking = update.status === "checking";
  const installing = update.status === "installing";
  const disabled = checking || installing;
  const currentVersion = update.currentVersion ?? "Unknown";

  useEffect(() => {
    if (update.status === "idle") void checkForSettingsUpdate(ctx).catch(() => undefined);
  }, [ctx, update.status]);

  const check = async () => {
    setInstallError(null);
    await checkForSettingsUpdate(ctx).catch(() => undefined);
  };

  const install = async () => {
    setInstallError(null);
    try {
      await installAndRestart(ctx);
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex flex-col p-5 gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium text-text">Jelly</div>
          <div className="mt-1 text-[12px] text-text-muted">Version {currentVersion}</div>
        </div>
        <button
          className="h-[26px] px-3 rounded-[5px] border border-border bg-bg text-[12px] text-text cursor-pointer hover:bg-bg-active disabled:opacity-60 disabled:cursor-default"
          onClick={check}
          disabled={disabled}
        >
          {checking ? "Checking..." : "Check for Updates"}
        </button>
      </div>

      <div className="rounded-[7px] border border-border bg-bg p-4">
        {update.status === "available" ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[12px] font-medium text-text">
                Version {update.availableVersion} is available
              </div>
              <div className="mt-1 text-[12px] text-text-muted">
                Install the update and restart Jelly.
              </div>
            </div>
            <button
              className="h-[26px] px-3 rounded-[5px] bg-accent text-accent-fg text-[12px] font-medium cursor-pointer hover:opacity-90 disabled:opacity-60 disabled:cursor-default"
              onClick={install}
              disabled={installing}
            >
              {installing ? "Installing..." : "Install and Restart"}
            </button>
          </div>
        ) : update.status === "current" ? (
          <StatusMessage title="Jelly is up to date" detail="No newer release is available." />
        ) : update.status === "error" ? (
          <StatusMessage title="Update check failed" detail={update.error ?? "Try again later."} />
        ) : update.status === "checking" ? (
          <StatusMessage title="Checking for updates" detail="Contacting the release endpoint." />
        ) : update.status === "installing" ? (
          <StatusMessage title="Installing update" detail="Jelly will restart when the update is ready." />
        ) : (
          <StatusMessage title="Check for updates" detail="See whether a newer signed release is available." />
        )}
      </div>

      {installError && <div className="text-[12px] text-red-400">{installError}</div>}
    </div>
  );
}

function StatusMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-text">{title}</div>
      <div className="mt-1 text-[12px] text-text-muted">{detail}</div>
    </div>
  );
}
