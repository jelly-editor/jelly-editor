/** A segmented control: a row of mutually-exclusive options, one selected. */
export function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-[2px] p-[2px] bg-bg rounded-[6px] border border-border">
      {options.map((o) => (
        <button
          key={o.value}
          className={`px-[10px] h-[22px] rounded-[4px] text-[11px] cursor-pointer ${
            value === o.value
              ? "bg-accent text-accent-fg font-medium"
              : "text-text-muted hover:text-text"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
