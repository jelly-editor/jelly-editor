import type { DialogButton, DialogRequest } from "@jelly/sdk";
import { useEffect, useRef } from "react";

const KIND_DOT: Record<NonNullable<DialogRequest["kind"]>, string> = {
  info: "bg-accent",
  warning: "bg-warning",
  error: "bg-danger",
};

function buttonClass(variant: DialogButton["variant"]): string {
  const base =
    "h-[26px] px-3 rounded-[6px] text-[12px] font-medium cursor-pointer transition-colors duration-[80ms]";
  if (variant === "primary") return `${base} bg-accent text-accent-fg hover:opacity-90`;
  if (variant === "danger") return `${base} bg-danger text-accent-fg hover:opacity-90`;
  return `${base} border border-border text-text hover:bg-bg-hover`;
}

/**
 * Presentational modal alert. Stateless: the host owns the request and resolves
 * the user's choice through `onChoose`. Esc / backdrop dismiss; Enter triggers
 * the primary button.
 */
export function AlertDialog({
  request,
  onChoose,
}: {
  request: DialogRequest;
  onChoose: (id: string) => void;
}) {
  const dismissId =
    request.dismissId ?? request.buttons[request.buttons.length - 1]?.id ?? "";
  // Keep the latest request/handler reachable from the one-shot key listener.
  const latest = useRef({ request, onChoose, dismissId });
  latest.current = { request, onChoose, dismissId };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { request: req, onChoose: choose, dismissId: dismiss } = latest.current;
      if (e.key === "Escape") {
        e.preventDefault();
        choose(dismiss);
      } else if (e.key === "Enter") {
        const primary = req.buttons.find((b) => b.variant === "primary");
        if (primary) {
          e.preventDefault();
          choose(primary.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[450] flex items-center justify-center bg-black/40 animate-[fadeIn_80ms_ease]"
      onClick={() => onChoose(dismissId)}
    >
      <div
        className="w-[360px] max-w-[calc(100vw-32px)] bg-bg-elevated border border-border rounded-[10px] shadow-2xl overflow-hidden animate-[fadeIn_100ms_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-4">
          {request.title && (
            <div className="flex items-center gap-2 mb-1.5">
              {request.kind && (
                <span className={`w-2 h-2 rounded-full shrink-0 ${KIND_DOT[request.kind]}`} />
              )}
              <span className="text-[13px] font-semibold text-text">{request.title}</span>
            </div>
          )}
          <div className="text-[12px] text-text-muted leading-relaxed whitespace-pre-wrap">
            {request.message}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          {request.buttons.map((b) => (
            <button key={b.id} onClick={() => onChoose(b.id)} className={buttonClass(b.variant)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
