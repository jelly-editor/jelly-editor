import type { ExtensionContext, SearchFileResult, SearchMatch } from "@jelly/sdk";
import { useEffect, useRef } from "react";
import { useSearchStore } from "../store";
import { runSearch } from "../run";
import { replaceAll, replaceFile, replaceLine } from "../replace";

/** A small action button revealed on row hover (replace-in-file / -line). */
function RowAction({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      className="flex items-center justify-center w-[18px] h-[18px] rounded-[3px] text-text-muted opacity-0 group-hover:opacity-100 hover:bg-bg-active hover:text-text shrink-0"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
  );
}

/** Drop leading whitespace for display, shifting match ranges to match. */
function trimLeading(text: string, ranges: [number, number][]) {
  const off = text.length - text.trimStart().length;
  if (!off) return { text, ranges };
  return {
    text: text.slice(off),
    ranges: ranges.map(([a, b]) => [Math.max(0, a - off), Math.max(0, b - off)] as [number, number]),
  };
}

function Highlighted({ text, ranges }: { text: string; ranges: [number, number][] }) {
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([a, b], i) => {
    if (a > cursor) parts.push(<span key={`t${i}`}>{text.slice(cursor, a)}</span>);
    parts.push(
      <span key={`m${i}`} className="bg-accent/30 text-text rounded-[2px]">
        {text.slice(a, b)}
      </span>,
    );
    cursor = Math.max(cursor, b);
  });
  if (cursor < text.length) parts.push(<span key="end">{text.slice(cursor)}</span>);
  return <>{parts}</>;
}

function MatchRow({
  match,
  showReplace,
  onClick,
  onReplace,
}: {
  match: SearchMatch;
  showReplace: boolean;
  onClick: () => void;
  onReplace: () => void;
}) {
  const { text, ranges } = trimLeading(match.text, match.ranges);
  return (
    <div
      className="group flex items-baseline gap-2 pl-6 pr-2 h-[22px] cursor-pointer text-[12px] text-text-muted hover:bg-bg-hover hover:text-text"
      onClick={onClick}
      title={match.text}
    >
      <span className="w-[28px] shrink-0 text-right text-[10px] text-text-dim tabular-nums">
        {match.line}
      </span>
      <span className="flex-1 truncate whitespace-pre">
        <Highlighted text={text} ranges={ranges} />
      </span>
      {showReplace && <RowAction title="Replace" onClick={onReplace} />}
    </div>
  );
}

function FileGroup({
  result,
  collapsed,
  showReplace,
  onToggle,
  onOpen,
}: {
  result: SearchFileResult;
  collapsed: boolean;
  showReplace: boolean;
  onToggle: () => void;
  onOpen: (line: number) => void;
}) {
  const name = result.relPath.split("/").pop() ?? result.relPath;
  const dir = result.relPath.slice(0, result.relPath.length - name.length - 1);
  return (
    <div className="flex flex-col">
      <div
        className="group flex items-center gap-1 pl-2 pr-2 h-[24px] cursor-pointer hover:bg-bg-hover"
        onClick={onToggle}
        title={result.relPath}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-text-dim transition-transform ${collapsed ? "" : "rotate-90"}`}
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
        <span className="flex-1 flex items-baseline gap-[6px] truncate text-[13px]">
          <span className="text-text truncate">{name}</span>
          {dir && <span className="text-[11px] text-text-dim truncate">{dir}</span>}
        </span>
        {showReplace && <RowAction title="Replace All in File" onClick={() => replaceFile(result)} />}
        <span className="text-[10px] text-text-dim tabular-nums">{result.matches.length}</span>
      </div>
      {!collapsed &&
        result.matches.map((m, i) => (
          <MatchRow
            key={`${m.line}:${i}`}
            match={m}
            showReplace={showReplace}
            onClick={() => onOpen(m.line)}
            onReplace={() => replaceLine(result, m.line)}
          />
        ))}
    </div>
  );
}

function Toggle({
  active,
  label,
  title,
  onClick,
}: {
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-[11px] font-medium cursor-pointer ${
        active ? "bg-accent/20 text-accent" : "text-text-muted hover:bg-bg-active hover:text-text"
      }`}
      onClick={onClick}
      title={title}
    >
      {label}
    </button>
  );
}

export function SearchPanel({ ctx }: { ctx: ExtensionContext }) {
  const {
    query,
    replacement,
    showReplace,
    replacing,
    caseSensitive,
    regex,
    workspacePath,
    searching,
    capped,
    error,
    results,
    collapsed,
    focusNonce,
    setQuery,
    setReplacement,
    toggleShowReplace,
    toggleCase,
    toggleRegex,
    toggleCollapse,
  } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input whenever ⌘⇧F (or the activity-bar item) asks for it.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusNonce]);

  // Debounced live search as the query/options change.
  useEffect(() => {
    const t = setTimeout(() => void runSearch(), 250);
    return () => clearTimeout(t);
  }, [query, caseSensitive, regex, workspacePath]);

  const matchCount = results.reduce((n, r) => n + r.matches.length, 0);

  function open(result: SearchFileResult, line: number) {
    const name = result.relPath.split("/").pop() ?? result.relPath;
    void ctx.commands.execute("editor.open", result.path, name, { line });
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center pl-3 pr-2 h-[34px] border-b border-border shrink-0">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em]">
          Search
        </span>
      </div>

      <div className="flex items-start gap-1 p-2 border-b border-border shrink-0">
        <button
          className="flex items-center justify-center w-[18px] h-[28px] text-text-muted hover:text-text shrink-0"
          onClick={toggleShowReplace}
          title={showReplace ? "Hide Replace" : "Toggle Replace"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${showReplace ? "rotate-90" : ""}`}
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch();
              }}
              placeholder="Search"
              spellCheck={false}
              className="flex-1 min-w-0 h-[28px] bg-bg border border-border rounded-[5px] px-2 text-[12px] text-text placeholder:text-text-dim outline-none focus:border-accent"
            />
            <Toggle active={caseSensitive} label="Aa" title="Match Case" onClick={toggleCase} />
            <Toggle active={regex} label=".*" title="Use Regular Expression" onClick={toggleRegex} />
          </div>
          {showReplace && (
            <div className="flex items-center gap-1">
              <input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void replaceAll();
                }}
                placeholder="Replace"
                spellCheck={false}
                className="flex-1 min-w-0 h-[28px] bg-bg border border-border rounded-[5px] px-2 text-[12px] text-text placeholder:text-text-dim outline-none focus:border-accent"
              />
              <button
                className="flex items-center justify-center h-[28px] px-2 rounded-[5px] text-[11px] font-medium bg-accent text-accent-fg cursor-pointer hover:opacity-[0.86] disabled:opacity-40 disabled:cursor-default whitespace-nowrap"
                onClick={() => void replaceAll()}
                disabled={!query || results.length === 0 || replacing}
                title="Replace All"
              >
                {replacing ? "…" : "All"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="px-3 py-3 text-[11px] text-danger">{error}</div>
        ) : !workspacePath ? (
          <div className="px-3 py-4 text-[11px] text-text-dim">Open a folder to search</div>
        ) : (
          <>
            {query && (
              <div className="px-3 py-[6px] text-[11px] text-text-dim">
                {searching
                  ? "Searching…"
                  : matchCount === 0
                    ? "No results"
                    : `${matchCount} result${matchCount === 1 ? "" : "s"} in ${results.length} file${
                        results.length === 1 ? "" : "s"
                      }${capped ? " (truncated)" : ""}`}
              </div>
            )}
            <div className="pb-2">
              {results.map((r) => (
                <FileGroup
                  key={r.path}
                  result={r}
                  collapsed={collapsed.has(r.path)}
                  showReplace={showReplace}
                  onToggle={() => toggleCollapse(r.path)}
                  onOpen={(line) => open(r, line)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
