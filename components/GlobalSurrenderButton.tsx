"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

type SurrenderGame = "guess_the_player" | "player_quiz" | "tic_tac_toe" | "wordle";
type AnalyticsGame = SurrenderGame | "super_lig_guess_the_player";
type GameConfig = {
  surrenderGame: SurrenderGame;
  analyticsGame: AnalyticsGame;
  storageKey: string;
  label: string;
};
type SurrenderResponse = { ok?: boolean; error?: string; score?: number; answerTitle?: string | null; answerDetail?: string | null; nextHref?: string | null; nextLabel?: string | null };

function getGameFromPath(pathname: string): GameConfig | null {
  if (pathname.includes("/guess-the-player/super-lig")) {
    return {
      surrenderGame: "guess_the_player",
      analyticsGame: "super_lig_guess_the_player",
      storageKey: "fb:session:guess_the_player",
      label: "Süper Lig Guess The Player",
    };
  }
  if (pathname.endsWith("/guess-the-player")) {
    return {
      surrenderGame: "guess_the_player",
      analyticsGame: "guess_the_player",
      storageKey: "fb:session:guess_the_player",
      label: "Guess The Player",
    };
  }
  if (pathname.endsWith("/player-quiz")) {
    return {
      surrenderGame: "player_quiz",
      analyticsGame: "player_quiz",
      storageKey: "fb:session:player_quiz",
      label: "Player Quiz",
    };
  }
  if (pathname.endsWith("/tic-tac-toe")) {
    return {
      surrenderGame: "tic_tac_toe",
      analyticsGame: "tic_tac_toe",
      storageKey: "fb:session:tic_tac_toe",
      label: "Tic Tac Toe",
    };
  }
  if (pathname.endsWith("/wordle")) {
    return {
      surrenderGame: "wordle",
      analyticsGame: "wordle",
      storageKey: "fb:session:wordle",
      label: "Wordle",
    };
  }
  return null;
}

export default function GlobalSurrenderButton() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SurrenderResponse | null>(null);
  const [error, setError] = useState("");
  const config = getGameFromPath(pathname ?? "");
  if (!config) return null;

  const homeHref = (pathname ?? "").startsWith("/en/") ? "/en" : "/tr";

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
        body: JSON.stringify({ game: config.surrenderGame, sessionId, daily }),
      });
      const json = (await response.json().catch(() => null)) as SurrenderResponse | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Oyun sonlandırılamadı.");
      window.sessionStorage.removeItem(config.storageKey);

      void fetch("/api/analytics/game-completed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameName: config.analyticsGame,
          sessionId,
          metadata: {
            won: false,
            surrendered: true,
            daily,
            score: Number(json.score ?? 0),
          },
        }),
      }).catch(() => {});

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
        <>
          <div className="fixed bottom-4 left-4 z-[70] hidden md:block">
            <button type="button" onClick={() => void surrender()} disabled={loading} className="rounded-xl border border-red-400/25 bg-[#111827]/95 px-4 py-2.5 text-xs font-black text-red-300 shadow-2xl shadow-black/40 backdrop-blur transition hover:border-red-400/50 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Bitiriliyor..." : "🏳️ Pes Et"}
            </button>
            {error && <p className="mt-2 max-w-[260px] rounded-lg bg-red-950/95 px-3 py-2 text-[11px] text-red-200">{error}</p>}
          </div>

          <div className="fixed inset-x-3 bottom-3 z-[80] flex gap-2 md:hidden">
            <button
              type="button"
              onClick={() => window.location.assign(homeHref)}
              className="flex-1 rounded-2xl border border-white/10 bg-[#111827]/95 px-4 py-3 text-sm font-black text-slate-100 shadow-2xl shadow-black/40 backdrop-blur"
            >
              ← Ana Sayfa
            </button>
            <button
              type="button"
              onClick={() => void surrender()}
              disabled={loading}
              className="flex-1 rounded-2xl border border-red-400/30 bg-[#111827]/95 px-4 py-3 text-sm font-black text-red-300 shadow-2xl shadow-black/40 backdrop-blur disabled:opacity-60"
            >
              {loading ? "Bitiriliyor..." : "🏳️ Pes Et"}
            </button>
          </div>
          {error && <p className="fixed inset-x-4 bottom-20 z-[81] rounded-xl bg-red-950/95 px-3 py-2 text-center text-[11px] text-red-200 md:hidden">{error}</p>}
        </>
      )}
      {result && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-500/25 bg-[#0b1422] p-6 text-center text-white shadow-2xl">
            <div className="text-4xl">🏳️</div>
            <h2 className="mt-3 text-2xl font-black">Oyunu bıraktın</h2>
            <p className="mt-2 text-sm text-slate-400">{config.label} kayıp olarak tamamlandı.</p>
            {result.answerTitle && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Doğru Cevap</p>
                <p className="mt-2 text-xl font-black text-white">{result.answerTitle}</p>
                {result.answerDetail && <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-400">{result.answerDetail}</p>}
              </div>
            )}
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => window.location.assign(homeHref)} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]">
                ← Ana Sayfa
              </button>
              <button type="button" onClick={() => window.location.assign(result.nextHref || homeHref)} className="rounded-xl bg-purple-500 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-400">
                {result.nextHref ? `Sıradaki → ${result.nextLabel ?? "Devam"}` : "Ana Sayfaya Dön"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
