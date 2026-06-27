import type { NotificationAction, NotificationKind, NotificationRequest } from "@jelly/sdk";
import { useEffect } from "react";

export interface NotificationItem {
  id: number;
  request: NotificationRequest;
}

const ICON_COLOR: Record<NotificationKind, string> = {
  info: "var(--color-accent)",
  warning: "var(--color-warning)",
  error: "var(--color-danger)",
};

function KindIcon({ kind }: { kind: NotificationKind }) {
  const color = ICON_COLOR[kind];
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "warning") {
    return (
      <svg {...common}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1={kind === "error" ? "8" : "16"} x2="12" y2={kind === "error" ? "12" : "12"} />
      <line x1="12" y1={kind === "error" ? "16" : "8"} x2="12.01" y2={kind === "error" ? "16" : "8"} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function actionClass(variant: NotificationAction["variant"]): string {
  const base =
    "h-[24px] px-2.5 rounded-[5px] text-[11px] font-medium leading-none whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-[80ms]";
  if (variant === "primary") return `${base} bg-accent text-accent-fg hover:opacity-90`;
  return `${base} border border-border text-text hover:bg-bg-hover`;
}

function NotificationCard({
  item,
  onAction,
  onDismiss,
}: {
  item: NotificationItem;
  onAction: (id: number, action: NotificationAction) => void;
  onDismiss: (id: number) => void;
}) {
  const { request } = item;
  const { timeout } = request;

  useEffect(() => {
    if (!timeout) return;
    const t = window.setTimeout(() => onDismiss(item.id), timeout);
    return () => window.clearTimeout(t);
  }, [item.id, timeout, onDismiss]);

  return (
    <div className="w-[360px] max-w-[calc(100vw-32px)] bg-bg-elevated border border-border rounded-[10px] shadow-2xl overflow-hidden animate-[fadeIn_120ms_ease] pointer-events-auto">
      <div className="flex gap-2.5 px-4 pt-3.5 pb-3">
        <span className="shrink-0 mt-px">
          <KindIcon kind={request.kind ?? "info"} />
        </span>
        <div className="flex-1 text-[12px] text-text leading-relaxed whitespace-pre-wrap break-words">
          {request.message}
        </div>
        <button
          onClick={() => onDismiss(item.id)}
          className="shrink-0 h-[18px] w-[18px] -mt-0.5 -mr-1 flex items-center justify-center rounded text-text-muted hover:text-text hover:bg-bg-hover cursor-pointer"
          aria-label="Dismiss"
        >
          <CloseIcon />
        </button>
      </div>
      {(request.source || request.actions?.length) && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
          {request.source && (
            <span className="text-[11px] text-text-muted whitespace-nowrap shrink-0">
              {request.source}
            </span>
          )}
          <div className="flex flex-wrap justify-end gap-1.5 flex-1">
            {request.actions?.map((action, i) => (
              <button
                key={i}
                onClick={() => onAction(item.id, action)}
                className={actionClass(action.variant)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Presentational notification stack, pinned bottom-right. Stateless: the host
 * owns the list and handles actions/dismissal through the callbacks.
 */
export function Notifications({
  items,
  onAction,
  onDismiss,
}: {
  items: NotificationItem[];
  onAction: (id: number, action: NotificationAction) => void;
  onDismiss: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[400] flex flex-col-reverse gap-2.5 pointer-events-none">
      {items.map((item) => (
        <NotificationCard
          key={item.id}
          item={item}
          onAction={onAction}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
