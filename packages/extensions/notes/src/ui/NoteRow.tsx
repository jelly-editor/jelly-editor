import { useEffect, useRef, useState } from "react";
import type { Note } from "../store";
import { formatDate } from "../utils";
import { NoteIcon } from "./icons";

interface Props {
  note: Note;
  isActive: boolean;
  isRenaming: boolean;
  onOpen: (note: Note) => void;
  onContextMenu: (e: React.MouseEvent, note: Note) => void;
  onRenameCommit: (note: Note, newAlias: string) => void;
  onRenameCancel: () => void;
}

export function NoteRow({ note, isActive, isRenaming, onOpen, onContextMenu, onRenameCommit, onRenameCancel }: Props) {
  const [draft, setDraft] = useState(note.alias);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setDraft(note.alias);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isRenaming, note.alias]);

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 h-[36px] pl-3 pr-2">
        <span className="text-text-dim shrink-0">
          <NoteIcon />
        </span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRenameCommit(note, draft.trim() || note.alias);
            if (e.key === "Escape") onRenameCancel();
          }}
          onBlur={() => onRenameCancel()}
          className="flex-1 bg-transparent text-[13px] text-text outline-none min-w-0"
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex flex-col justify-center h-[40px] pl-3 pr-2 cursor-pointer hover:bg-bg-hover ${
        isActive ? "bg-bg-active" : ""
      }`}
      onClick={() => onOpen(note)}
      onContextMenu={(e) => onContextMenu(e, note)}
      title={note.alias}
    >
      <span className={`text-[13px] truncate leading-tight ${isActive ? "text-text" : "text-text-muted"}`}>
        {note.alias}
      </span>
      <span className="text-[10px] text-text-dim leading-tight mt-[1px]">
        {formatDate(note.createdAt)}
      </span>
    </div>
  );
}
