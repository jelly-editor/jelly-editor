import type { ExtensionContext, PaletteItem, PaletteProvider } from "@jelly/sdk";
import { useEffect, useRef, useState } from "react";
import { useCommandPaletteUi } from "../store";
import { PaletteInput } from "./PaletteInput";

/** Pick the active provider: a typed prefix wins, else the opened provider. */
function resolveProvider(providers: PaletteProvider[], providerId: string, query: string) {
  const byPrefix = providers.find((p) => p.prefix && query.startsWith(p.prefix));
  if (byPrefix) return { provider: byPrefix, q: query.slice(byPrefix.prefix!.length) };
  const active = providers.find((p) => p.id === providerId) ?? providers[0];
  return { provider: active, q: query };
}

function PaletteRow({
  item,
  active,
  onSelect,
  onHover,
}: {
  item: PaletteItem;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      className={`flex items-center justify-between gap-3 px-4 h-[34px] text-left cursor-pointer shrink-0 ${
        active ? "bg-bg-active text-text" : "text-text-muted hover:bg-bg-active hover:text-text"
      }`}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <span className="text-[13px] truncate">{item.label}</span>
      {item.hint ? (
        <kbd className="shrink-0 text-[11px] text-text-muted font-sans tabular-nums">{item.hint}</kbd>
      ) : item.detail ? (
        <span className="shrink-0 text-[11px] text-text-muted opacity-60 truncate max-w-[55%]">
          {item.detail}
        </span>
      ) : null}
    </button>
  );
}

export function CommandPalette({ ctx }: { ctx: ExtensionContext }) {
  const open = useCommandPaletteUi((s) => s.open);
  const providerId = useCommandPaletteUi((s) => s.providerId);
  const setOpen = useCommandPaletteUi((s) => s.setOpen);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [items, setItems] = useState<PaletteItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const providers = ctx.palette.list();
  const { provider, q } = resolveProvider(providers, providerId, query);

  // Reset the query/selection each time the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    setTimeout(() => inputRef.current?.focus(), 0);
    // Keyed on providerId too: selecting a command that opens another provider
    // (e.g. "Keyboard Shortcuts") keeps `open` true the whole time, so without
    // providerId here the stale query would linger and filter the new source.
  }, [open, providerId]);

  // Ask the active provider for items whenever it or the query changes.
  useEffect(() => {
    if (!open || !provider) {
      setItems([]);
      return;
    }
    let alive = true;
    Promise.resolve(provider.getItems(q))
      .then((next) => {
        if (!alive) return;
        setItems(next);
        setSelected(0);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [open, provider?.id, q]);

  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Widget-local navigation (Esc / arrows / Enter) while the palette is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        accept(items[selected]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, selected]);

  function accept(item: PaletteItem | undefined) {
    if (!item) return;
    setOpen(false);
    item.onAccept();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 animate-[fadeIn_60ms_ease]"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex flex-col w-[520px] max-h-[400px] bg-bg-elevated border border-border rounded-[10px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <PaletteInput
          inputRef={inputRef}
          placeholder={provider?.placeholder ?? "Type a command…"}
          query={query}
          onChange={(v) => {
            setQuery(v);
            setSelected(0);
          }}
        />
        <div ref={listRef} className="flex flex-col overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-text-muted">
              {query ? "No matches" : "Type to search"}
            </div>
          ) : (
            items.map((item, i) => (
              <PaletteRow
                key={item.id}
                item={item}
                active={i === selected}
                onSelect={() => accept(item)}
                onHover={() => setSelected(i)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
