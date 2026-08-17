"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { trackGameCompleted } from "@/lib/analytics/game-analytics";

type SupportedGame = "guess_the_player" | "player_quiz" | "tic_tac_toe" | "wordle";
type SurrenderResponse = { ok?: boolean; error?: string; score?: number; answerTitle?: string | null; answerDetail?: string | null; nextHref?: string | null; nextLabel?: string | null };

const GAME_CONFIG: Record<SupportedGame, { storageKey: string; label: string }> = {
  guess_the_player: { storageKey: "fb:session:guess_the_player", label: "Guess The Player" },
  player_quiz: { storageKey: "fb:session:player_quiz", label: "Player Quiz" },
  tic_tac_toe: { storageKey: "fb:session:tic_tac_toe", label: "Tic Tac Toe" },
  wordle: { storageKey: "fb:session:wordle", label: "Wordle" },
};

function getGameFromPath(pathname: string): SupportedGame | null {
  if (pathname.endsWith("/guess-the-player")) return "guess_the_player";
  if (pathname.endsWith("/player-quiz")) return "player_quiz";
  if (pathname.endsWith("/tic-tac-toe")) return "tic_tac_toe";
  if (pathname.endsWith("/wordle")) return "wordle";
  return null;
}

export default function GlobalSurrenderButton() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SurrenderResponse | null>(null);
  const [error, setError] = useState("");
  const game = getGameFromPath(pathname ?? "");
  if (!game) return null;
  const config = GAME_CONFIG[game];

  async function surrender() {
    if (loading || result) return;
    const daily = new URLSearchParams(window.location.search).get("daily") === "1";
    if (!window.confirm("Pes edersen oyun kayıp olarak tamamlanacak. Emin misin?")) return;
    const sessionId = window.sessionStorage.getItem(config.storageKey);
    if (!sessionId) {
      setError("Oyun oturumu henüz hazır değil. Birkaç saniye sonra tekrar dene.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/game-surrender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, sessionId, daily }),
      });
      const json = (await response.json().catch(() => null)) as SurrenderResponse | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Oyun sonlandırılamadı.");
      window.sessionStorage.removeItem(config.storageKey);
      void trackGameCompleted(game, sessionId, {
        won: false,
        surrendered: true,
        daily,
        score: Number(json.score ?? 0),
      });
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oyun sonlandırılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!result && (
        <div className="fixed bottom-4 left-4 z-[70]">
          <button type="button" onClick={() => void surrender()} disabled={loading} className="rounded-xl border border-red-400/25 bg-[#111827]/95 px-4 py-2.5 text-xs font-black text-red-300">
            {loading ? "Bitiriliyor..." : "🏳️ Pes Et"}
          </button>
          {error && <p className="mt-2 max-w-[260px] rounded-lg bg-red-950/95 px-3 py-2 text-[11px] text-red-200">{error}</p>}
        </div>
      )}
      {result && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0b1422] p-6 text-center text-white">
            <h2 className="text-2xl font-black">Oyunu bıraktın</h2>
            <p className="mt-2 text-sm text-slate-400">{config.label} kayıp olarak tamamlandı.</p>
            {result.answerTitle && <p className="mt-5 text-xl font-black">{result.answerTitle}</p>}
            {result.answerDetail && <p className="mt-2 whitespace-pre-line text-xs text-slate-400">{result.answerDetail}</p>}
            <button type="button" onClick={() => window.location.assign(result.nextHref || "/")} className="mt-6 rounded-xl bg-purple-500 px-5 py-3 text-sm font-black">
              {result.nextHref ? `Sıradaki Göreve Geç → ${result.nextLabel ?? "Devam"}` : "Ana Sayfaya Dön"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
