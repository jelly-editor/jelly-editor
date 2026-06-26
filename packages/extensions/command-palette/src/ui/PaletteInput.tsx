import type { RefObject } from "react";

interface Props {
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder: string;
  query: string;
  onChange: (value: string) => void;
}

export function PaletteInput({ inputRef, placeholder, query, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 h-[44px] border-b border-border shrink-0">
      <SearchIcon />
      <input
        ref={inputRef}
        className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-muted outline-none"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      {query && (
        <button className="text-text-muted hover:text-text text-[11px]" onClick={() => onChange("")}>
          ✕
        </button>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-text-muted shrink-0">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
