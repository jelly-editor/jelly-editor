/** An on/off switch with a sliding knob. */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`relative w-[36px] h-[20px] rounded-full cursor-pointer transition-colors ${
        value ? "bg-accent" : "bg-bg-active"
      }`}
      onClick={() => onChange(!value)}
    >
      <span
        className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white transition-all ${
          value ? "left-[18px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}
