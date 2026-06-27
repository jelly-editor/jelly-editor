import type { CommandDescriptor } from "@jelly/sdk";
import { formatKeybinding } from "@jelly/ui";

interface Props {
  commands: CommandDescriptor[];
  selected: number;
  query: string;
  /** key spec bound to a command id, if any — shown as a hint */
  keyFor: (id: string) => string | undefined;
  onSelect: (id: string) => void;
  onHover: (i: number) => void;
}

export function CommandList({ commands, selected, query, keyFor, onSelect, onHover }: Props) {
  if (commands.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[12px] text-text-muted">
        {query ? `No commands match "${query}"` : "No commands available"}
      </div>
    );
  }

  return (
    <>
      {commands.map((cmd, i) => (
        <button
          key={cmd.id}
          className={`flex items-center justify-between px-4 h-[34px] text-left cursor-pointer shrink-0 ${
            i === selected
              ? "bg-bg-active text-text"
              : "text-text-muted hover:bg-bg-active hover:text-text"
          }`}
          onClick={() => onSelect(cmd.id)}
          onMouseEnter={() => onHover(i)}
        >
          <span className="text-[13px]">{cmd.title}</span>
          {keyFor(cmd.id) ? (
            <kbd className="text-[11px] text-text-muted font-sans tabular-nums">
              {formatKeybinding(keyFor(cmd.id)!)}
            </kbd>
          ) : (
            <span className="text-[11px] text-text-muted opacity-60">{cmd.id}</span>
          )}
        </button>
      ))}
    </>
  );
}
