import { create } from "zustand";

export interface GameRegistration {
  id: string;
  name: string;
  description?: string;
  openCommand: string;
  /** SVG string rendered as the game icon (16×16 recommended) */
  icon?: string;
}

interface GamesStore {
  games: GameRegistration[];
  register(game: GameRegistration): void;
  unregister(id: string): void;
}

export const useGamesStore = create<GamesStore>((set) => ({
  games: [],
  register(game) {
    set((s) => ({
      games: s.games.some((g) => g.id === game.id)
        ? s.games.map((g) => (g.id === game.id ? game : g))
        : [...s.games, game],
    }));
  },
  unregister(id) {
    set((s) => ({ games: s.games.filter((g) => g.id !== id) }));
  },
}));
