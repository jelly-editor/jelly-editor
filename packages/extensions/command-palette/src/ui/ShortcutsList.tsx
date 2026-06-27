import { formatKeybinding } from "@jelly/ui";

export interface ShortcutRow {
  command: string;
  title: string;
  key: string;
  when?: string;
}

interface Props {
  shortcuts: ShortcutRow[];
  selected: number;
  query: string;
  onSelect: (command: string) => void;
  onHover: (i: number) => void;
}

export function ShortcutsList({ shortcuts, selected, query, onSelect, onHover }: Props) {
  if (shortcuts.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[12px] text-text-muted">
        {query ? `No shortcuts match "${query}"` : "No shortcuts bound"}
      </div>
    );
  }

  return (
    <>
      {shortcuts.map((s, i) => (
        <button
          key={`${s.command}:${s.key}`}
          className={`flex items-center justify-between gap-3 px-4 h-[34px] text-left cursor-pointer shrink-0 ${
            i === selected ? "bg-bg-active text-text" : "text-text-muted hover:bg-bg-active hover:text-text"
          }`}
          onClick={() => onSelect(s.command)}
          onMouseEnter={() => onHover(i)}
        >
          <span className="text-[13px] truncate">{s.title}</span>
          <kbd className="shrink-0 text-[11px] text-text font-sans bg-bg border border-border rounded-[4px] px-[6px] py-[1px]">
            {formatKeybinding(s.key)}
          </kbd>
        </button>
      ))}
    </>
  );
}
