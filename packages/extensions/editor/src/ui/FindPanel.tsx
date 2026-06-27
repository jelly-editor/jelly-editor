import {
  findNext,
  findPrevious,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import type { EditorView } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";

interface Props {
  view: EditorView;
  onClose: () => void;
}

function IconButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-[11px] leading-none cursor-pointer transition-colors duration-[80ms] ${
        active
          ? "bg-accent/20 text-accent"
          : "bg-transparent text-text-muted hover:bg-bg-active hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export function FindPanel({ view, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [replace, setReplace] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regexp, setRegexp] = useState(false);
  const [matchCount, setMatchCount] = useState<{ current: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        view.focus();
      } else if (e.key === "Enter" && e.target === inputRef.current) {
        e.preventDefault();
        if (e.shiftKey) findPrevious(view);
        else findNext(view);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, onClose]);

  useEffect(() => {
    if (!query) {
      setMatchCount(null);
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
      return;
    }

    let searchQuery: SearchQuery;
    try {
      searchQuery = new SearchQuery({
        search: query,
        caseSensitive,
        wholeWord,
        regexp,
        replace,
      });
    } catch {
      return;
    }

    view.dispatch({ effects: setSearchQuery.of(searchQuery) });

    try {
      const doc = view.state.doc;
      const cursor = searchQuery.getCursor(doc);
      let total = 0;
      let current = 0;
      const head = view.state.selection.main.head;

      let result = cursor.next();
      while (!result.done) {
        total++;
        if (result.value.from <= head) current = total;
        result = cursor.next();
      }
      setMatchCount(total > 0 ? { current, total } : null);
    } catch {
      setMatchCount(null);
    }
  }, [query, caseSensitive, wholeWord, regexp, view]);

  function doFindNext() {
    if (!query) return;
    findNext(view);
    updateCurrentMatch();
  }

  function doFindPrev() {
    if (!query) return;
    findPrevious(view);
    updateCurrentMatch();
  }

  function updateCurrentMatch() {
    setTimeout(() => {
      if (!query) return;
      const head = view.state.selection.main.head;
      let searchQuery: SearchQuery;
      try {
        searchQuery = new SearchQuery({ search: query, caseSensitive, wholeWord, regexp });
      } catch {
        return;
      }
      const cursor = searchQuery.getCursor(view.state.doc);
      let total = 0;
      let current = 0;
      let r = cursor.next();
      while (!r.done) {
        total++;
        if (r.value.from <= head) current = total;
        r = cursor.next();
      }
      setMatchCount(total > 0 ? { current, total } : null);
    }, 0);
  }

  const hasQuery = query.length > 0;

  return (
    <div className="absolute top-0 right-4 z-[200] flex flex-col gap-[1px] w-[340px] bg-bg-elevated border border-border rounded-b-[8px] shadow-2xl animate-[fadeIn_80ms_ease]">
      {/* Find row */}
      <div className="flex items-center gap-1.5 px-2 py-[5px]">
        {/* toggle replace chevron */}
        <button
          onClick={() => setShowReplace((s) => !s)}
          className="flex items-center justify-center w-[16px] h-[16px] rounded-[3px] text-text-muted hover:text-text cursor-pointer transition-colors duration-[80ms] shrink-0"
          title={showReplace ? "Hide replace" : "Show replace"}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
            className={`transition-transform duration-[120ms] ${showReplace ? "" : "-rotate-90"}`}
          >
            <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* search input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find"
            spellCheck={false}
            className="w-full h-[24px] px-2 pr-[52px] bg-bg border border-border rounded-[4px] text-[12px] text-text placeholder-text-dim outline-none focus:border-accent/50 transition-colors duration-[80ms]"
          />
          {/* inline toggles */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-[2px]">
            <IconButton title="Match case (Alt+C)" active={caseSensitive} onClick={() => setCaseSensitive((v) => !v)}>
              Aa
            </IconButton>
            <IconButton title="Whole word (Alt+W)" active={wholeWord} onClick={() => setWholeWord((v) => !v)}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="1" y="3" width="9" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <line x1="1" y1="9.5" x2="10" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton title="Use regular expression (Alt+R)" active={regexp} onClick={() => setRegexp((v) => !v)}>
              .*
            </IconButton>
          </div>
        </div>

        {/* match count */}
        <span className="text-[11px] text-text-muted w-[52px] text-right shrink-0 tabular-nums">
          {!hasQuery ? "" : matchCount ? `${matchCount.current}/${matchCount.total}` : "No results"}
        </span>

        {/* prev / next */}
        <IconButton title="Previous match (Shift+Enter)" onClick={doFindPrev}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 6.5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>
        <IconButton title="Next match (Enter)" onClick={doFindNext}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>

        {/* close */}
        <IconButton title="Close (Escape)" onClick={() => { onClose(); view.focus(); }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconButton>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1.5 px-2 pb-[5px]">
          <input
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); replaceNext(view); updateCurrentMatch(); } }}
            placeholder="Replace"
            spellCheck={false}
            className="flex-1 h-[24px] px-2 bg-bg border border-border rounded-[4px] text-[12px] text-text placeholder-text-dim outline-none focus:border-accent/50 transition-colors duration-[80ms]"
          />
          <button
            onClick={() => { replaceNext(view); updateCurrentMatch(); }}
            disabled={!hasQuery}
            className="px-2 h-[24px] rounded-[4px] bg-bg border border-border text-[11px] text-text-muted cursor-pointer hover:bg-bg-active hover:text-text disabled:opacity-40 disabled:cursor-default transition-colors duration-[80ms] whitespace-nowrap"
          >
            Replace
          </button>
          <button
            onClick={() => replaceAll(view)}
            disabled={!hasQuery}
            className="px-2 h-[24px] rounded-[4px] bg-bg border border-border text-[11px] text-text-muted cursor-pointer hover:bg-bg-active hover:text-text disabled:opacity-40 disabled:cursor-default transition-colors duration-[80ms] whitespace-nowrap"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}
