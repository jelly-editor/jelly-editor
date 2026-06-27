import type { CommandDescriptor, DirEntry, ExtensionContext } from "@jelly/sdk";
import { useEffect, useRef, useState } from "react";
import { useCommandPaletteUi } from "../store";
import { CommandList } from "./CommandList";
import { FileList } from "./FileList";
import { PaletteInput } from "./PaletteInput";
import { ShortcutsList, type ShortcutRow } from "./ShortcutsList";
import { fuzzyMatch } from "../utils/fuzzyMatch";

export function CommandPalette({ ctx }: { ctx: ExtensionContext }) {
  const open = useCommandPaletteUi((s) => s.open);
  const mode = useCommandPaletteUi((s) => s.mode);
  const setOpen = useCommandPaletteUi((s) => s.setOpen);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [files, setFiles] = useState<DirEntry[]>([]);
  const [workspaceRoot, setWorkspaceRoot] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allCommands = ctx.commands.list();
  const bindings = ctx.keybindings.list();
  const keyFor = (id: string) => bindings.find((b) => b.command === id)?.key;

  const commands: CommandDescriptor[] = allCommands.filter((cmd) => cmd.palette !== false);
  const filteredCommands = commands.filter(
    (cmd) => fuzzyMatch(query, cmd.title) || fuzzyMatch(query, cmd.id),
  );
  const filteredFiles = files.filter(
    (f) => fuzzyMatch(query, f.name) || fuzzyMatch(query, f.path),
  );

  // Every bound key, joined to its command's title — the cheat sheet.
  const titleFor = new Map(allCommands.map((c) => [c.id, c.title]));
  const shortcuts: ShortcutRow[] = bindings.map((b) => ({
    command: b.command,
    title: titleFor.get(b.command) ?? b.command,
    key: b.key,
    when: b.when,
  }));
  const filteredShortcuts = shortcuts.filter(
    (s) => fuzzyMatch(query, s.title) || fuzzyMatch(query, s.key) || fuzzyMatch(query, s.command),
  );

  const count =
    mode === "commands"
      ? filteredCommands.length
      : mode === "files"
        ? filteredFiles.length
        : filteredShortcuts.length;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (mode === "files") {
      void Promise.all([
        ctx.commands.execute<DirEntry[]>("files.list").catch(() => []),
        ctx.commands.execute<string | null>("workspace.getPath").catch(() => null),
      ]).then(([list, root]) => {
        setFiles(list);
        setWorkspaceRoot(root ? root + "/" : "");
      });
    }
  }, [open, mode]);

  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, count - 1)));
  }, [count]);

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
        } else if (mode === "files") {
          const file = filteredFiles[selected];
          if (file) openFile(file);
        } else {
          const sc = filteredShortcuts[selected];
          if (sc) executeCommand(sc.command);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, filteredCommands, filteredFiles, filteredShortcuts, selected, count]);

  function executeCommand(id: string) {
    setOpen(false);
    void ctx.commands.execute(id).catch(() => {});
  }

  function openFile(file: DirEntry) {
    setOpen(false);
    void ctx.commands.execute("editor.open", file.path, file.name).catch(() => {});
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
          placeholder={
            mode === "files"
              ? "Search files…"
              : mode === "shortcuts"
                ? "Search keyboard shortcuts…"
                : "Type a command…"
          }
          query={query}
          onChange={(v) => { setQuery(v); setSelected(0); }}
        />
        <div ref={listRef} className="flex flex-col overflow-y-auto py-1">
          {mode === "commands" ? (
            <CommandList
              commands={filteredCommands}
              selected={selected}
              query={query}
              keyFor={keyFor}
              onSelect={executeCommand}
              onHover={setSelected}
            />
          ) : mode === "files" ? (
            <FileList
              files={filteredFiles}
              selected={selected}
              query={query}
              workspaceRoot={workspaceRoot}
              onSelect={openFile}
              onHover={setSelected}
            />
          ) : (
            <ShortcutsList
              shortcuts={filteredShortcuts}
              selected={selected}
              query={query}
              onSelect={executeCommand}
              onHover={setSelected}
            />
          )}
        </div>
      </div>
    </div>
  );
}
