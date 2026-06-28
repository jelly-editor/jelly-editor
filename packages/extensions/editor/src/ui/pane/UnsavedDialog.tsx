import { useEffect } from "react";

export function UnsavedDialog({
  name,
  onSave,
  onDiscard,
  onCancel,
}: {
  name: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter") onSave();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onSave]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 animate-[fadeIn_80ms_ease]"
      onClick={onCancel}
    >
      <div
        className="flex flex-col gap-4 w-[360px] p-5 bg-bg-elevated border border-border rounded-[10px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-[6px]">
          <span className="text-[13px] font-semibold text-text">Save changes?</span>
          <span className="text-[12px] text-text-muted leading-relaxed">
            Do you want to save the changes you made to{" "}
            <span className="text-text font-medium">{name}</span>? Your changes will be
            lost if you don't save them.
          </span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            className="px-3 h-[28px] rounded-[5px] bg-transparent text-text-muted text-[12px] cursor-pointer hover:bg-bg-hover hover:text-text"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 h-[28px] rounded-[5px] bg-transparent text-danger text-[12px] cursor-pointer hover:bg-danger/15"
            onClick={onDiscard}
          >
            Don't Save
          </button>
          <button
            className="px-3 h-[28px] rounded-[5px] bg-accent text-accent-fg text-[12px] font-medium cursor-pointer hover:opacity-[0.86]"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
