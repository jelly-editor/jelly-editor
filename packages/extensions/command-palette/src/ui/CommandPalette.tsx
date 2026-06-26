import type { CommandDescriptor, DirEntry, ExtensionContext } from "@jelly/sdk";
import { useEffect, useRef, useState } from "react";
import { useCommandPaletteUi } from "../store";

function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({ ctx }: { ctx: ExtensionContext }) {
  const open = useCommandPaletteUi((s) => s.open);
  const mode = useCommandPaletteUi((s) => s.mode);
  const setOpen = useCommandPaletteUi((s) => s.setOpen);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [files, setFiles] = useState<DirEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state and load files when opened
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (mode === "files") {
      void ctx.commands
        .execute<DirEntry[]>("files.list")
        .then(setFiles)
        .catch(() => setFiles([]));
    }
  }, [open, mode]);

  const commands: CommandDescriptor[] = ctx.commands
    .list()
    .filter((cmd) => cmd.palette !== false);

  const filteredCommands = commands.filter(
    (cmd) => fuzzyMatch(query, cmd.title) || fuzzyMatch(query, cmd.id),
  );

  const filteredFiles = files.filter(
    (f) => fuzzyMatch(query, f.name) || fuzzyMatch(query, f.path),
  );

  const count = mode === "commands" ? filteredCommands.length : filteredFiles.length;

  // Clamp selection when filter changes
  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, count - 1)));
  }, [count]);

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, count - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (mode === "commands") {
          const cmd = filteredCommands[selected];
          if (cmd) executeCommand(cmd.id);
        } else {
          const file = filteredFiles[selected];
          if (file) openFile(file);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, filteredCommands, filteredFiles, selected, count]);

  function executeCommand(id: string) {
    setOpen(false);
    void ctx.commands.execute(id).catch(() => {});
  }

  function openFile(file: DirEntry) {
    setOpen(false);
    void ctx.commands.execute("editor.open", file.path, file.name).catch(() => {});
  }

  if (!open) return null;

  const placeholder = mode === "files" ? "Search files…" : "Type a command…";

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 animate-[fadeIn_60ms_ease]"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex flex-col w-[520px] max-h-[400px] bg-bg-elevated border border-border rounded-[10px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 h-[44px] border-b border-border shrink-0">
          <SearchIcon />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-muted outline-none"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            spellCheck={false}
          />
          {query && (
            <button
              className="text-text-muted hover:text-text text-[11px]"
              onClick={() => setQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div ref={listRef} className="flex flex-col overflow-y-auto py-1">
          {mode === "commands" ? (
            filteredCommands.length === 0 ? (
              <Empty query={query} noun="commands" />
            ) : (
              filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.id}
                  className={`flex items-center justify-between px-4 h-[34px] text-left cursor-pointer shrink-0 ${
                    i === selected
                      ? "bg-bg-active text-text"
                      : "text-text-muted hover:bg-bg-active hover:text-text"
                  }`}
                  onClick={() => executeCommand(cmd.id)}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="text-[13px]">{cmd.title}</span>
                  <span className="text-[11px] text-text-muted opacity-60">{cmd.id}</span>
                </button>
              ))
            )
          ) : filteredFiles.length === 0 ? (
            <Empty query={query} noun="files" />
          ) : (
            filteredFiles.map((file, i) => (
              <button
                key={file.path}
                className={`flex items-center justify-between px-4 h-[34px] text-left cursor-pointer shrink-0 ${
                  i === selected
                    ? "bg-bg-active text-text"
                    : "text-text-muted hover:bg-bg-active hover:text-text"
                }`}
                onClick={() => openFile(file)}
                onMouseEnter={() => setSelected(i)}
              >
                <span className="text-[13px]">{file.name}</span>
                <span className="text-[11px] text-text-muted opacity-60 truncate max-w-[260px]">
                  {file.path}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ query, noun }: { query: string; noun: string }) {
  return (
    <div className="px-4 py-6 text-center text-[12px] text-text-muted">
      {query ? `No ${noun} match "${query}"` : `No ${noun} available`}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className="text-text-muted shrink-0"
    >
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
