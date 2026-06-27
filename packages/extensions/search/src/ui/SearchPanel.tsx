import type { ExtensionContext, SearchFileResult, SearchMatch } from "@jelly/sdk";
import { useEffect, useRef } from "react";
import { useSearchStore } from "../store";
import { runSearch } from "../run";

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

function MatchRow({ match, onClick }: { match: SearchMatch; onClick: () => void }) {
  const { text, ranges } = trimLeading(match.text, match.ranges);
  return (
    <div
      className="flex items-baseline gap-2 pl-6 pr-2 h-[22px] cursor-pointer text-[12px] text-text-muted hover:bg-bg-hover hover:text-text"
      onClick={onClick}
      title={match.text}
    >
      <span className="w-[28px] shrink-0 text-right text-[10px] text-text-dim tabular-nums">
        {match.line}
      </span>
      <span className="truncate whitespace-pre">
        <Highlighted text={text} ranges={ranges} />
      </span>
    </div>
  );
}

function FileGroup({
  result,
  collapsed,
  onToggle,
  onOpen,
}: {
  result: SearchFileResult;
  collapsed: boolean;
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
        <span className="text-[10px] text-text-dim tabular-nums">{result.matches.length}</span>
      </div>
      {!collapsed &&
        result.matches.map((m, i) => (
          <MatchRow key={`${m.line}:${i}`} match={m} onClick={() => onOpen(m.line)} />
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

      <div className="flex items-center gap-1 p-2 border-b border-border shrink-0">
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
