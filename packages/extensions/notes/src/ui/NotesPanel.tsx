import type { ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { ContextMenu, useContextMenu } from "@jelly/ui";
import { useEffect, useRef, useState } from "react";
import { useNotesStore, type Note } from "../store";
import { formatDefaultTitle, formatId } from "../utils";
import { NoteIcon, PlusIcon } from "./icons";
import { NoteRow } from "./NoteRow";

export function NotesPanel({ ctx, notesDir }: { ctx: ExtensionContext; notesDir: (wsPath: string) => string }) {
  const { notes, workspacePath, activeNotePath } = useNotesStore();
  const [creating, setCreating] = useState(false);
  const [alias, setAlias] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menu = useContextMenu<Note>();

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  async function openNote(note: Note) {
    useNotesStore.getState().setActiveNotePath(note.path);
    await ctx.commands.execute("editor.open", note.path, note.alias).catch(() => {});
  }

  async function createNote() {
    const ws = workspacePath;
    if (!ws) return;

    const title = alias.trim() || formatDefaultTitle();
    const id = formatId();
    const dir = notesDir(ws);
    const filePath = `${dir}/${id}.md`;

    try {
      await ipc.fs.createDir(dir).catch(() => {});
      await ipc.fs.save(filePath, `# ${title}\n\n`);
    } catch {
      return;
    }

    const note: Note = { id, alias: title, path: filePath, createdAt: Date.now() };
    useNotesStore.getState().addNote(note);

    const existing = (await ctx.storage.get<Note[]>(`notes:${ws}`)) ?? [];
    await ctx.storage.set(`notes:${ws}`, [note, ...existing]);

    setAlias("");
    setCreating(false);
    void openNote(note);
  }

  async function deleteNote(note: Note) {
    const ws = workspacePath;
    const ok = await ctx.dialog.confirm(`Delete "${note.alias}"? This cannot be undone.`, {
      title: "Delete Note",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    await ipc.fs.delete(note.path).catch(() => {});
    useNotesStore.getState().removeNote(note.id);
    if (ws) {
      const existing = (await ctx.storage.get<Note[]>(`notes:${ws}`)) ?? [];
      await ctx.storage.set(`notes:${ws}`, existing.filter((n) => n.id !== note.id));
    }
    if (activeNotePath === note.path) {
      useNotesStore.getState().setActiveNotePath(null);
    }
  }

  async function commitRename(note: Note, newAlias: string) {
    setRenamingId(null);
    if (newAlias === note.alias) return;
    const ws = workspacePath;

    useNotesStore.getState().setNotes(
      notes.map((n) => (n.id === note.id ? { ...n, alias: newAlias } : n)),
    );

    if (ws) {
      const existing = (await ctx.storage.get<Note[]>(`notes:${ws}`)) ?? [];
      await ctx.storage.set(
        `notes:${ws}`,
        existing.map((n) => (n.id === note.id ? { ...n, alias: newAlias } : n)),
      );
    }
  }

  function cancelCreate() {
    setAlias("");
    setCreating(false);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center pl-3 pr-2 h-[34px] border-b border-border shrink-0">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em]">Notes</span>
        {workspacePath && (
          <button
            className="ml-auto flex items-center justify-center w-[20px] h-[20px] rounded-[4px] text-text-muted hover:text-text hover:bg-bg-hover"
            onClick={() => setCreating(true)}
            title="New note"
          >
            <PlusIcon />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {creating && (
          <div className="flex items-center gap-2 h-[36px] pl-3 pr-2">
            <span className="text-text-dim shrink-0">
              <NoteIcon />
            </span>
            <input
              ref={inputRef}
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createNote();
                if (e.key === "Escape") cancelCreate();
              }}
              onBlur={cancelCreate}
              placeholder="Note name…"
              className="flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-text-dim min-w-0"
            />
          </div>
        )}

        {notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            isActive={activeNotePath === note.path}
            isRenaming={renamingId === note.id}
            onOpen={openNote}
            onContextMenu={(e, n) => menu.open(e, n)}
            onRenameCommit={commitRename}
            onRenameCancel={() => setRenamingId(null)}
          />
        ))}

        {!workspacePath && (
          <div className="px-3 py-4 text-[11px] text-text-dim">Open a folder to use notes</div>
        )}

        {workspacePath && notes.length === 0 && !creating && (
          <div className="px-3 py-4 text-[11px] text-text-dim">No notes yet. Press + to create one.</div>
        )}
      </div>

      {menu.state && (
        <ContextMenu
          x={menu.state.x}
          y={menu.state.y}
          onClose={menu.close}
          items={[
            {
              label: "Rename",
              onSelect: () => setRenamingId(menu.state!.data.id),
            },
            { type: "separator" },
            {
              label: "Delete",
              danger: true,
              onSelect: () => void deleteNote(menu.state!.data),
            },
          ]}
        />
      )}
    </div>
  );
}
