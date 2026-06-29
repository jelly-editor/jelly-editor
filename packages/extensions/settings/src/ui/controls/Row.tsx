/** A settings line: muted label on the left, control on the right. */
export function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${description ? "min-h-[36px] py-1" : "h-[36px]"}`}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[12px] text-text-muted">{label}</span>
        {description && <span className="text-[11px] text-text-muted/60 whitespace-nowrap">{description}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
