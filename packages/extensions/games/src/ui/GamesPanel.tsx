import type { ExtensionContext } from "@jelly/sdk";
import { useState } from "react";
import { useGamesStore, type GameRegistration } from "../store";

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
      <circle cx="12" cy="12" r="10" className="opacity-20" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function GameIcon({ svg }: { svg: string }) {
  return (
    <span
      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-[5px] bg-bg text-text-muted"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function DefaultGameIcon() {
  return (
    <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-[5px] bg-bg text-text-muted">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function GameRow({ game, ctx }: { game: GameRegistration; ctx: ExtensionContext }) {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await ctx.commands.execute(game.openCommand);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="flex items-center gap-3 w-full px-2 py-2 rounded-[5px] text-left hover:bg-bg-active transition-colors duration-[80ms] cursor-pointer group"
      onClick={handleOpen}
      disabled={loading}
    >
      {game.icon ? <GameIcon svg={game.icon} /> : <DefaultGameIcon />}
      <div className="flex flex-col flex-1 gap-[1px] min-w-0">
        <span className="text-[13px] text-text font-medium leading-none">{game.name}</span>
        {game.description && (
          <span className="text-[11px] text-text-muted leading-snug truncate">{game.description}</span>
        )}
      </div>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted pr-1">
        {loading ? <SpinnerIcon /> : <PlayIcon />}
      </div>
    </button>
  );
}

export function GamesPanel({ ctx }: { ctx: ExtensionContext }) {
  const games = useGamesStore((s) => s.games);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted border-b border-border select-none">
        Mini Games
      </div>
      {games.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-[12px] text-text-muted px-4 text-center">
          No games installed
        </div>
      ) : (
        <div className="flex flex-col gap-[2px] p-2">
          {games.map((game) => (
            <GameRow key={game.id} game={game} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  );
}
