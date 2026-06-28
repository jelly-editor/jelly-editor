import { useEditorStore } from "../../store";

/** Drag handle redistributing the flex weights of a split's two adjacent children. */
export function Resizer({
  splitId,
  index,
  dir,
  sizes,
  containerRef,
}: {
  splitId: string;
  index: number;
  dir: "row" | "column";
  sizes: number[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const total = dir === "row" ? rect.width : rect.height;
    const start = dir === "row" ? e.clientX : e.clientY;
    const startSizes = [...sizes];
    const sum = startSizes[index] + startSizes[index + 1];
    const weight = startSizes.reduce((a, b) => a + b, 0);
    const min = 0.1 * sum;

    const onMove = (ev: MouseEvent) => {
      const pos = dir === "row" ? ev.clientX : ev.clientY;
      const delta = ((pos - start) / total) * weight;
      const left = Math.max(min, Math.min(sum - min, startSizes[index] + delta));
      const next = [...startSizes];
      next[index] = left;
      next[index + 1] = sum - left;
      useEditorStore.getState().setSplitSizes(splitId, next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className={`relative z-10 shrink-0 bg-border ${dir === "row" ? "w-px cursor-col-resize" : "h-px cursor-row-resize"}`}
      onMouseDown={onMouseDown}
    >
      <div
        className={`absolute hover:bg-accent hover:opacity-40 active:bg-accent active:opacity-40 ${
          dir === "row" ? "top-0 -left-[2px] w-[5px] h-full" : "left-0 -top-[2px] h-[5px] w-full"
        }`}
      />
    </div>
  );
}
