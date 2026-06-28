/** A settings line: muted label on the left, control on the right. */
export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between h-[36px]">
      <span className="text-[12px] text-text-muted">{label}</span>
      {children}
    </div>
  );
}
