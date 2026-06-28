/** A numeric stepper: −/+ buttons around a clamped value with an optional suffix. */
export function Stepper({
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center gap-[2px] p-[2px] bg-bg rounded-[6px] border border-border">
      <button
        className="flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-text-muted text-[13px] leading-none cursor-pointer hover:bg-bg-active hover:text-text disabled:opacity-40 disabled:cursor-default"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
      >
        −
      </button>
      <span className="w-[40px] text-center text-[11px] text-text tabular-nums">
        {value}
        {suffix}
      </span>
      <button
        className="flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-text-muted text-[13px] leading-none cursor-pointer hover:bg-bg-active hover:text-text disabled:opacity-40 disabled:cursor-default"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
