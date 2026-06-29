import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchReleaseBody } from "../changelog";
import { useSettingsUi } from "../store";

export function ChangelogModal() {
  const open = useSettingsUi((s) => s.changelogOpen);
  const version = useSettingsUi((s) => s.changelogVersion);
  const closeChangelog = useSettingsUi((s) => s.closeChangelog);

  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !version) return;
    if (fetchedFor.current === version) return;
    fetchedFor.current = version;
    setBody(null);
    setError(null);
    fetchReleaseBody(version)
      .then(setBody)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, [open, version]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeChangelog();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeChangelog]);

  if (!open || !version) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 animate-[fadeIn_80ms_ease]"
      onClick={closeChangelog}
    >
      <div
        className="flex flex-col w-[600px] h-[520px] bg-bg-elevated border border-border rounded-[10px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-[44px] border-b border-border shrink-0">
          <div className="text-[13px] font-medium text-text">What's New in v{version}</div>
          <button
            className="flex items-center justify-center w-[20px] h-[20px] rounded-[4px] text-text-muted text-[15px] leading-none hover:bg-bg-active hover:text-text"
            onClick={closeChangelog}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="p-5 text-[12px] text-text-muted">
              Failed to load release notes: {error}
            </div>
          ) : body === null ? (
            <div className="p-5 text-[12px] text-text-muted">Loading…</div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none px-6 py-4 prose-pre:p-0 prose-pre:bg-transparent prose-code:text-[0.85em]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
