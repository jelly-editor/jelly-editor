import { create } from "zustand";
import { getRandomWords } from "./words";

export type Mode = "15" | "30" | "60";

export interface HighScore {
  wpm: number;
  accuracy: number;
  mode: Mode;
  date: string;
}

interface TypingState {
  mode: Mode;
  words: string[];
  wordIndex: number;
  charIndex: number;
  /** typed chars per word, including the current in-progress word */
  typed: string[];
  /** per-word correctness: true = correct, false = error, undefined = not yet typed */
  wordResults: (boolean | undefined)[];
  started: boolean;
  finished: boolean;
  timeLeft: number;
  highScores: HighScore[];

  setMode(mode: Mode): void;
  reset(): void;
  start(): void;
  tick(): void;
  typeChar(char: string): void;
  backspace(): void;
  finishWord(): void;
  finish(): void;
  setHighScores(scores: HighScore[]): void;
}

const WORD_COUNT = 80;

function freshWords() {
  return getRandomWords(WORD_COUNT);
}

export const useTypingStore = create<TypingState>((set, get) => ({
  mode: "30",
  words: freshWords(),
  wordIndex: 0,
  charIndex: 0,
  typed: [""],
  wordResults: [],
  started: false,
  finished: false,
  timeLeft: 30,
  highScores: [],

  setMode(mode) {
    set({
      mode,
      words: freshWords(),
      wordIndex: 0,
      charIndex: 0,
      typed: [""],
      wordResults: [],
      started: false,
      finished: false,
      timeLeft: parseInt(mode, 10),
    });
  },

  reset() {
    const { mode } = get();
    set({
      words: freshWords(),
      wordIndex: 0,
      charIndex: 0,
      typed: [""],
      wordResults: [],
      started: false,
      finished: false,
      timeLeft: parseInt(mode, 10),
    });
  },

  start() {
    set({ started: true });
  },

  tick() {
    const { timeLeft } = get();
    if (timeLeft <= 1) {
      get().finish();
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  typeChar(char) {
    const { started, finished, words, wordIndex, charIndex, typed } = get();
    if (finished) return;
    if (!started) get().start();

    const currentTyped = typed[wordIndex] ?? "";
    const maxLen = words[wordIndex].length + 5;
    if (currentTyped.length >= maxLen) return;

    const newTyped = [...typed];
    newTyped[wordIndex] = currentTyped + char;
    set({ typed: newTyped, charIndex: charIndex + 1 });
  },

  backspace() {
    const { finished, wordIndex, typed } = get();
    if (finished) return;

    const currentTyped = typed[wordIndex] ?? "";
    if (currentTyped.length === 0) {
      if (wordIndex === 0) return;
      const newTyped = [...typed];
      const newResults = get().wordResults.slice(0, wordIndex - 1);
      set({ wordIndex: wordIndex - 1, typed: newTyped, wordResults: newResults });
      return;
    }

    const newTyped = [...typed];
    newTyped[wordIndex] = currentTyped.slice(0, -1);
    set({ typed: newTyped, charIndex: Math.max(0, get().charIndex - 1) });
  },

  finishWord() {
    const { finished, words, wordIndex, typed, wordResults } = get();
    if (finished) return;
    if (!get().started) get().start();

    const currentTyped = typed[wordIndex] ?? "";
    if (!currentTyped) return;

    const correct = currentTyped === words[wordIndex];
    const newResults = [...wordResults, correct];
    const nextIndex = wordIndex + 1;

    if (nextIndex >= words.length) {
      get().finish();
      return;
    }

    const newTyped = [...typed];
    newTyped[nextIndex] = newTyped[nextIndex] ?? "";
    set({ wordIndex: nextIndex, wordResults: newResults, typed: newTyped, charIndex: 0 });
  },

  finish() {
    set({ finished: true, started: false });
  },

  setHighScores(scores) {
    set({ highScores: scores });
  },
}));

export function calcWpm(wordResults: (boolean | undefined)[], modeSeconds: number): number {
  const correct = wordResults.filter(Boolean).length;
  return Math.round((correct / modeSeconds) * 60);
}
