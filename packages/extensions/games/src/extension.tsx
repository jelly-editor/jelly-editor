import type { Extension, ExtensionContext } from "@jelly/sdk";
import type { GameRegistration } from "./store";
import { useGamesStore } from "./store";
import { GamesPanel } from "./ui/GamesPanel";

function GamepadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
      <rect x="2" y="6" width="20" height="12" rx="4" />
    </svg>
  );
}

export const gamesExtension: Extension = {
  manifest: {
    id: "jelly.games",
    name: "Games",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "games.register", title: "Register Game", palette: false },
        { id: "games.unregister", title: "Unregister Game", palette: false },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useGamesStore;

    ctx.subscriptions.push(
      ctx.commands.register("games.register", (game: unknown) => {
        store.getState().register(game as GameRegistration);
      }),
      ctx.commands.register("games.unregister", (id: unknown) => {
        store.getState().unregister(id as string);
      }),
    );

    ctx.ui.contributeActivityBarItem({
      id: "games",
      align: "bottom",
      order: 85,
      title: "Games",
      icon: () => <GamepadIcon />,
    });

    ctx.ui.contributeSidebarPanel({
      id: "games",
      render: () => <GamesPanel ctx={ctx} />,
    });
  },
};
