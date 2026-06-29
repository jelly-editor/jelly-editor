import type { GitStash } from "../store";

export function StashRow({
  stash,
  onApply,
  onDrop,
}: {
  stash: GitStash;
  onApply: (stash: GitStash) => void;
  onDrop: (stash: GitStash) => void;
}) {
  const label = stash.message || `stash@{${stash.index}}`;
  return (
    <div className="group relative flex items-center gap-2 h-[24px] pl-3 pr-2 text-[13px] text-text-muted hover:bg-bg-hover">
      <span className="flex-1 truncate">{label}</span>
      <button
        className="flex items-center justify-center w-[18px] h-[18px] rounded-[3px] bg-bg-active text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger"
        onClick={(e) => { e.stopPropagation(); onDrop(stash); }}
        title="Drop stash"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>
      <button
        className="flex items-center justify-center w-[18px] h-[18px] rounded-[3px] bg-bg-active text-text-muted opacity-0 group-hover:opacity-100 hover:text-text"
        onClick={(e) => { e.stopPropagation(); onApply(stash); }}
        title="Apply stash"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>
  );
}
