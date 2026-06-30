import type { ExtensionContext } from "@jelly/sdk";
import { useCallback, useEffect, useRef } from "react";
import { calcWpm, type HighScore, type Mode, useTypingStore } from "../store";

const MODES: Mode[] = ["15", "30", "60"];

export function TypingTestView({ ctx, active }: { ctx: ExtensionContext; active: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);

  const {
    mode, words, wordIndex, typed, wordResults,
    started, finished, timeLeft, highScores,
    setMode, reset, typeChar, backspace, finishWord,
    setHighScores,
  } = useTypingStore();

  useEffect(() => {
    ctx.storage.get<HighScore[]>("highScores").then((scores) => {
      if (scores) setHighScores(scores);
    });
  }, []);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      useTypingStore.getState().tick();
    }, 1000);
    return () => clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (!finished) return;
    const wpm = calcWpm(wordResults, parseInt(mode, 10));
    const accuracy = wordResults.length === 0
      ? 100
      : Math.round((wordResults.filter(Boolean).length / wordResults.length) * 100);
    const entry: HighScore = { wpm, accuracy, mode, date: new Date().toISOString() };
    const updated = [...highScores, entry]
      .sort((a, b) => b.wpm - a.wpm)
      .slice(0, 10);
    setHighScores(updated);
    ctx.storage.set("highScores", updated);
  }, [finished]);

  useEffect(() => {
    if (!wordsRef.current) return;
    const activeWord = wordsRef.current.querySelector("[data-active='true']") as HTMLElement | null;
    if (!activeWord) return;
    const container = wordsRef.current;
    const scrollTarget = activeWord.offsetLeft - container.offsetWidth / 2 + activeWord.offsetWidth / 2;
    container.scrollLeft = Math.max(0, scrollTarget);
  }, [wordIndex]);

  useEffect(() => {
    if (active && !finished) {
      inputRef.current?.focus();
    }
  }, [active, finished]);

  const handleKeyDownCapture = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (finished) {
        reset();
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === "Tab") {
        finishWord();
        inputRef.current?.focus();
      }
    }
  }, [finished, finishWord, reset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (finished) return;

    if (e.key === " ") {
      e.preventDefault();
      finishWord();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      backspace();
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typeChar(e.key);
    }
  }, [finished, finishWord, backspace, typeChar]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const wpm = calcWpm(wordResults, parseInt(mode, 10));
  const currentTyped = typed[wordIndex] ?? "";

  if (finished) {
    return <ResultsView onRestart={reset} />;
  }

  return (
    <div
      className="flex flex-col h-full w-full items-center justify-center bg-bg overflow-hidden"
      style={{ fontFamily: "var(--font-mono, monospace)" }}
      onClick={focusInput}
      onKeyDownCapture={handleKeyDownCapture}
    >
      <div className="w-full max-w-[750px] px-6 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {MODES.map((m) => (
              <button
                key={m}
                className={`px-3 py-1 rounded text-[13px] transition-colors cursor-pointer ${
                  mode === m
                    ? "text-accent font-medium"
                    : "text-text-muted hover:text-text"
                }`}
                onClick={(e) => { e.stopPropagation(); setMode(m); setTimeout(() => inputRef.current?.focus(), 0); }}
              >
                {m}s
              </button>
            ))}
          </div>
          <div className="flex items-center gap-6">
            {started && (
              <span className="text-[13px] text-text-muted tabular-nums">{wpm} wpm</span>
            )}
            <span
              className={`text-[28px] font-light tabular-nums transition-colors ${
                timeLeft <= 5 ? "text-danger" : "text-accent"
              }`}
            >
              {timeLeft}
            </span>
          </div>
        </div>

        <div
          ref={wordsRef}
          className="relative overflow-hidden select-none"
          style={{ height: "2.5rem" }}
        >
          <div className="flex flex-nowrap gap-x-3 text-[1.3rem] leading-[2.5rem]">
            {words.map((word, wi) => {
              const isActive = wi === wordIndex;
              const typedWord = typed[wi] ?? "";
              const result = wordResults[wi];

              return (
                <span key={wi} data-active={isActive} className="relative shrink-0">
                  {word.split("").map((ch, ci) => {
                    const typedCh = typedWord[ci];
                    let color = "text-text-muted/40";
                    if (typedCh !== undefined) {
                      color = typedCh === ch ? "text-text" : "text-danger";
                    }
                    return <span key={ci} className={color}>{ch}</span>;
                  })}
                  {typedWord.length > word.length && (
                    <span className="text-danger">{typedWord.slice(word.length)}</span>
                  )}
                  {isActive && (
                    <span
                      className="absolute animate-pulse"
                      style={{
                        left: `${currentTyped.length}ch`,
                        top: 0,
                        width: "2px",
                        height: "100%",
                        background: "var(--color-accent)",
                        borderRadius: "1px",
                      }}
                    />
                  )}
                  {!isActive && result === false && (
                    <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-danger/50" />
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <input
          ref={inputRef}
          className="opacity-0 absolute w-0 h-0 pointer-events-none"
          onKeyDown={handleKeyDown}
          onChange={() => {}}
          value=""
          readOnly
          tabIndex={-1}
        />

        <p className="text-center text-[11px] text-text-muted/50">
          space / tab — next word · tab/enter after finish — restart
        </p>
      </div>
    </div>
  );
}

function ResultsView({ onRestart }: { onRestart: () => void }) {
  const { mode, wordResults, highScores } = useTypingStore();
  const modeSeconds = parseInt(mode, 10);
  const wpm = calcWpm(wordResults, modeSeconds);
  const correct = wordResults.filter(Boolean).length;
  const total = wordResults.length;
  const accuracy = total === 0 ? 100 : Math.round((correct / total) * 100);

  const topScores = highScores.filter((s) => s.mode === mode).slice(0, 5);
  const isPersonalBest = topScores.length > 0 && topScores[0].wpm === wpm;

  return (
    <div
      className="flex flex-col h-full w-full items-center justify-center bg-bg overflow-hidden"
      style={{ fontFamily: "var(--font-mono, monospace)" }}
    >
      <div className="w-full max-w-[600px] px-6 flex flex-col gap-10">
        <div className="flex items-end gap-12">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-text-muted uppercase tracking-widest">wpm</span>
            <span className={`text-[5rem] font-light leading-none tabular-nums ${isPersonalBest ? "text-accent" : "text-text"}`}>
              {wpm}
            </span>
            {isPersonalBest && (
              <span className="text-[11px] text-accent">personal best</span>
            )}
          </div>
          <div className="flex flex-col gap-1 pb-3">
            <span className="text-[12px] text-text-muted uppercase tracking-widest">acc</span>
            <span className="text-[2.5rem] font-light leading-none tabular-nums text-text">
              {accuracy}%
            </span>
          </div>
          <div className="flex flex-col gap-1 pb-3">
            <span className="text-[12px] text-text-muted uppercase tracking-widest">words</span>
            <span className="text-[2.5rem] font-light leading-none tabular-nums text-text">
              {correct}/{total}
            </span>
          </div>
        </div>

        {topScores.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-text-muted uppercase tracking-widest">{mode}s leaderboard</span>
            <div className="flex flex-col gap-1">
              {topScores.map((s, i) => (
                <div key={i} className="flex items-center gap-4 text-[13px]">
                  <span className="text-text-muted/50 w-4 tabular-nums">{i + 1}</span>
                  <span className={`tabular-nums font-medium ${i === 0 ? "text-accent" : "text-text"}`}>
                    {s.wpm} wpm
                  </span>
                  <span className="text-text-muted">{s.accuracy}%</span>
                  <span className="text-text-muted/50 ml-auto text-[11px]">
                    {new Date(s.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded text-[13px] text-text-muted hover:text-text hover:bg-bg-active transition-colors cursor-pointer"
            onClick={onRestart}
            autoFocus
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            restart
          </button>
          <span className="text-[11px] text-text-muted/50">tab / enter to restart</span>
        </div>
      </div>
    </div>
  );
}
