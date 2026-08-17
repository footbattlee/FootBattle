"use client";

import { usePathname } from "next/navigation";

type SupportedGame = "guess_the_player" | "player_quiz" | "tic_tac_toe" | "wordle";

function getGameFromPath(pathname: string): SupportedGame | null {
  if (pathname.endsWith("/guess-the-player")) return "guess_the_player";
  if (pathname.endsWith("/player-quiz")) return "player_quiz";
  if (pathname.endsWith("/tic-tac-toe")) return "tic_tac_toe";
  if (pathname.endsWith("/wordle")) return "wordle";
  return null;
}

export default function GlobalSurrenderButton() {
  const pathname = usePathname();
  const game = getGameFromPath(pathname ?? "");
  if (!game) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[70]">
      <button type="button" className="rounded-xl border border-red-400/25 bg-[#111827]/95 px-4 py-2.5 text-xs font-black text-red-300">
        🏳️ Pes Et
      </button>
    </div>
  );
}
