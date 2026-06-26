import type { DirEntry } from "@jelly/sdk";

interface Props {
  files: DirEntry[];
  selected: number;
  query: string;
  workspaceRoot: string;
  onSelect: (file: DirEntry) => void;
  onHover: (i: number) => void;
}

export function FileList({ files, selected, query, workspaceRoot, onSelect, onHover }: Props) {
  if (files.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[12px] text-text-muted">
        {query ? `No files match "${query}"` : "No files available"}
      </div>
    );
  }

  return (
    <>
      {files.map((file, i) => {
        const relativePath = file.path.startsWith(workspaceRoot)
          ? file.path.slice(workspaceRoot.length)
          : file.path;
        return (
          <button
            key={file.path}
            className={`flex items-center justify-between px-4 h-[34px] text-left cursor-pointer shrink-0 ${
              i === selected
                ? "bg-bg-active text-text"
                : "text-text-muted hover:bg-bg-active hover:text-text"
            }`}
            onClick={() => onSelect(file)}
            onMouseEnter={() => onHover(i)}
          >
            <span className="text-[13px]">{file.name}</span>
            <span className="text-[11px] text-text-muted opacity-60 truncate max-w-[260px]">
              {relativePath}
            </span>
          </button>
        );
      })}
    </>
  );
}
