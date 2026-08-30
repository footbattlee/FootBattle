"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type GameCode = "tic_tac_toe" | "club_clash" | "club_nation";
type MatchmakingResponse = {
  ok?: boolean;
  error?: string;
  state?: "searching" | "matched";
  botInMs?: number;
  match?: {
    id: string;
    game_code: GameCode;
    opponent_kind: "human" | "bot";
    bot_name?: string | null;
  };
};

const games: Array<{ code: GameCode; icon: string; tr: string; en: string; descTr: string; descEn: string }> = [
  { code: "tic_tac_toe", icon: "⭕", tr: "Futbol Tic Tac Toe", en: "Football Tic Tac Toe", descTr: "Düellodaki aynı 3x3 mekanik.", descEn: "The same 3x3 duel rules." },
  { code: "club_clash", icon: "⚽", tr: "2 Takım 1 Oyuncu", en: "2 Clubs 1 Player", descTr: "İlk 3 roundu alan kazanır.", descEn: "First to 3 rounds wins." },
  { code: "club_nation", icon: "🌍", tr: "1 Takım 1 Millet", en: "1 Club 1 Nation", descTr: "İlk 3 roundu alan kazanır.", descEn: "First to 3 rounds wins." },
];

export default function MobileRankPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<GameCode>("tic_tac_toe");
  const [searching, setSearching] = useState(false);
  const [matchMessage, setMatchMessage] = useState("");
  const [botCountdown, setBotCountdown] = useState<number | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollRef.current) window.clearTimeout(pollRef.current);
  }, []);

  function matchmakingEndpoint(gameCode: GameCode) {
    return gameCode === "club_nation" ? "/api/rank/club-nation-matchmaking" : "/api/rank/matchmaking";
  }

  async function matchmakingTick(gameCode: GameCode) {
    const endpoint = matchmakingEndpoint(gameCode);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(gameCode === "club_nation" ? {} : { body: JSON.stringify({ gameCode }) }),
    });
    const result = await response.json() as MatchmakingResponse;

    if (!response.ok || !result.ok) {
      throw new Error(result.error ?? (tr ? "Rakip aranamadı." : "Could not search for an opponent."));
    }

    if (result.state === "matched" && result.match) {
      setMatchMessage(result.match.opponent_kind === "bot"
        ? (tr ? `Rakip bulundu: ${result.match.bot_name ?? "Bot Eren :)"} • Bot` : `Opponent found: ${result.match.bot_name ?? "Bot Eren :)"} • Bot`)
        : (tr ? "Gerçek oyuncu bulundu!" : "Real player found!"));
      setBotCountdown(null);
      pollRef.current = window.setTimeout(() => {
        router.push(`/${locale}/rank/match/${result.match!.id}`);
      }, 1200);
      return;
    }

    setBotCountdown(Math.max(0, Math.ceil(Number(result.botInMs ?? 0) / 1000)));
    setMatchMessage(tr ? "Rakip aranıyor…" : "Searching for opponent…");
    pollRef.current = window.setTimeout(() => void matchmakingTick(gameCode).catch(handleMatchError), 1200);
  }

  function handleMatchError(error: unknown) {
    setSearching(false);
    setBotCountdown(null);
    setMatchMessage(error instanceof Error ? error.message : (tr ? "Rakip aranamadı." : "Could not search for an opponent."));
  }

  async function startSearch() {
    if (searching) return;
    setSearching(true);
    setMatchMessage(tr ? "Rakip aranıyor…" : "Searching for opponent…");
    try {
      await matchmakingTick(selectedGame);
    } catch (error) {
      handleMatchError(error);
    }
  }

  async function cancelSearch() {
    if (pollRef.current) window.clearTimeout(pollRef.current);
    pollRef.current = null;
    await fetch(matchmakingEndpoint(selectedGame), { method: "DELETE" }).catch(() => null);
    setSearching(false);
    setBotCountdown(null);
    setMatchMessage("");
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-3 text-white">
      <div className="mx-auto max-w-xl">
        <header>
          <Link href={`/${locale}`} aria-label="FootBattle" className="inline-flex">
            <img src="/footbattle-logo.png" alt="FootBattle" className="h-8 w-auto object-contain" />
          </Link>
          <div className="mt-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-green-300">FootBattle Ranked</p>
            <h1 className="mt-0.5 text-2xl font-black">{tr ? "Ranked Maç" : "Ranked Match"}</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">{tr ? "Oyunu seç, rakibini bul veya arkadaşına düello gönder." : "Pick a game, find an opponent or challenge a friend."}</p>
          </div>
        </header>

        <section className="mt-3 rounded-[24px] border border-green-500/20 bg-green-500/[0.055] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-green-300">{tr ? "Maç Bul" : "Find Match"}</p>
              <h2 className="mt-0.5 text-lg font-black">{tr ? "Oyununu seç" : "Choose your game"}</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black text-slate-400">BETA</span>
          </div>

          <div className="mt-3 grid gap-2">
            {games.map((game) => {
              const selected = selectedGame === game.code;
              return (
                <button
                  key={game.code}
                  type="button"
                  disabled={searching}
                  onClick={() => setSelectedGame(game.code)}
                  className={`flex min-h-[66px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${selected ? "border-green-400/60 bg-green-500/10" : "border-white/10 bg-[#0c1929]"}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 text-lg">{game.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-tight">{tr ? game.tr : game.en}</span>
                    <span className="mt-0.5 block text-[10px] leading-tight text-slate-500">{tr ? game.descTr : game.descEn}</span>
                  </span>
                  <span className={`text-base ${selected ? "text-green-300" : "text-slate-700"}`}>●</span>
                </button>
              );
            })}
          </div>

          {!searching ? (
            <button type="button" onClick={() => void startSearch()} className="mt-3 w-full rounded-2xl bg-green-500 px-4 py-3 text-[15px] font-black text-[#07111f] active:scale-[0.99]">
              🔎 {tr ? "Rakip Ara" : "Find Opponent"}
            </button>
          ) : (
            <div className="mt-3 rounded-2xl border border-purple-400/20 bg-purple-500/[0.08] p-3 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-white/10 border-t-purple-400" />
              <p className="mt-2 text-sm font-black">{matchMessage}</p>
              {botCountdown !== null && botCountdown > 0 ? (
                <p className="mt-1 text-[10px] text-slate-500">
                  {tr ? `${botCountdown} sn içinde oyuncu bulunmazsa Bot Eren :) devreye girer.` : `Bot Eren :) joins in ${botCountdown}s if no player is found.`}
                </p>
              ) : null}
              <button type="button" onClick={() => void cancelSearch()} className="mt-2 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-black text-slate-400">
                {tr ? "Aramayı İptal Et" : "Cancel"}
              </button>
            </div>
          )}

          {!searching && matchMessage ? <p className="mt-2 text-center text-[10px] font-bold text-red-300">{matchMessage}</p> : null}

          <Link
            href={`/${locale}/duels?quick=1&game=${selectedGame}`}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-green-400/25 bg-[#0c1929] px-4 py-3 text-[15px] font-black text-green-300 transition active:scale-[0.99]"
          >
            ⚔ {tr ? "Düello Gönder" : "Send Duel"}
          </Link>
        </section>
      </div>
    </main>
  );
}
