"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type GameCode = "tic_tac_toe" | "club_clash" | "club_nation";
type RankMe = { elo?: number; peakElo?: number; rankName?: string; rankIcon?: string; wins?: number; losses?: number; gamesPlayed?: number; progressPercent?: number; nextRankName?: string | null; nextRankLp?: number | null };
type RankData = { ok?: boolean; season?: { title?: string } | null; me?: RankMe | null };
type MatchmakingResponse = { ok?: boolean; error?: string; state?: "searching" | "matched"; botInMs?: number; match?: { id: string; game_code: GameCode; opponent_kind: "human" | "bot"; bot_name?: string | null; challenge_token?: string | null } };

const games = [
  { code: "tic_tac_toe" as const, icon: "⭕", tr: "Futbol Tic Tac Toe", en: "Football Tic Tac Toe", shortTr: "3x3 futbol bilgisi", shortEn: "3x3 football knowledge" },
  { code: "club_clash" as const, icon: "⚽", tr: "2 Takım 1 Oyuncu", en: "2 Clubs 1 Player", shortTr: "İlk 3 roundu al", shortEn: "First to 3 rounds" },
  { code: "club_nation" as const, icon: "🌍", tr: "1 Takım 1 Millet", en: "1 Club 1 Nation", shortTr: "İlk 3 roundu al", shortEn: "First to 3 rounds" },
];

export default function MobileRankPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<GameCode>("tic_tac_toe");
  const [searching, setSearching] = useState(false);
  const [matched, setMatched] = useState<MatchmakingResponse["match"] | null>(null);
  const [matchMessage, setMatchMessage] = useState("");
  const [botCountdown, setBotCountdown] = useState<number | null>(null);
  const [rankData, setRankData] = useState<RankData | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    void fetch("/api/rank/leaderboard", { cache: "no-store" }).then(r => r.json()).then(setRankData).catch(() => null);
    return () => { if (pollRef.current) window.clearTimeout(pollRef.current); };
  }, []);

  const me = rankData?.me;
  const elo = Number(me?.elo ?? 1000);
  const selected = games.find(g => g.code === selectedGame) ?? games[0];
  const toNext = me?.nextRankLp ? Math.max(0, Number(me.nextRankLp) - elo) : null;

  function matchmakingEndpoint(gameCode: GameCode) {
    return gameCode === "club_nation" ? "/api/rank/club-nation-matchmaking" : "/api/rank/matchmaking";
  }

  async function prepareAndOpenMatch(match: NonNullable<MatchmakingResponse["match"]>) {
    if (match.game_code === "tic_tac_toe" && match.challenge_token) {
      setMatchMessage(match.opponent_kind === "bot" ? (match.bot_name ?? "Bot Eren :)") : (tr ? "Gerçek Oyuncu" : "Real Player"));
      const duelUrl = `/tic-tac-toe/duel/${encodeURIComponent(match.challenge_token)}?ranked=1&match=${encodeURIComponent(match.id)}`;
      try {
        const response = await fetch(`/api/challenges/${encodeURIComponent(match.challenge_token)}/tic-tac-toe/state`, { cache: "no-store" });
        if (!response.ok) throw new Error("grid_prewarm_failed");
      } catch {
        router.push(`/${locale}/rank/match/${match.id}`);
        return;
      }
      router.push(duelUrl);
      return;
    }
    router.push(`/${locale}/rank/match/${match.id}`);
  }

  async function matchmakingTick(gameCode: GameCode) {
    const response = await fetch(matchmakingEndpoint(gameCode), {
      method: "POST", headers: { "Content-Type": "application/json" },
      ...(gameCode === "club_nation" ? {} : { body: JSON.stringify({ gameCode }) }),
    });
    const result = await response.json() as MatchmakingResponse;
    if (!response.ok || !result.ok) throw new Error(result.error ?? (tr ? "Rakip aranamadı." : "Could not search for an opponent."));

    if (result.state === "matched" && result.match) {
      setMatched(result.match);
      setMatchMessage(result.match.opponent_kind === "bot" ? (result.match.bot_name ?? "Bot Eren :)") : (tr ? "Gerçek Oyuncu" : "Real Player"));
      setBotCountdown(null);
      void prepareAndOpenMatch(result.match);
      return;
    }
    setBotCountdown(Math.max(0, Math.ceil(Number(result.botInMs ?? 0) / 1000)));
    pollRef.current = window.setTimeout(() => void matchmakingTick(gameCode).catch(handleMatchError), 1200);
  }

  function handleMatchError(error: unknown) {
    setSearching(false); setMatched(null); setBotCountdown(null);
    setMatchMessage(error instanceof Error ? error.message : (tr ? "Rakip aranamadı." : "Could not search for an opponent."));
  }

  async function startSearch() {
    if (searching) return;
    setSearching(true); setMatched(null); setMatchMessage(""); setBotCountdown(10);
    try { await matchmakingTick(selectedGame); } catch (error) { handleMatchError(error); }
  }

  async function cancelSearch() {
    if (pollRef.current) window.clearTimeout(pollRef.current);
    pollRef.current = null;
    await fetch(matchmakingEndpoint(selectedGame), { method: "DELETE" }).catch(() => null);
    setSearching(false); setMatched(null); setBotCountdown(null); setMatchMessage("");
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-3 text-white">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between">
          <Link href={`/${locale}`} aria-label="FootBattle" className="inline-flex"><img src="/footbattle-logo.png" alt="FootBattle" className="h-8 w-auto object-contain" /></Link>
          <span className="rounded-full border border-green-400/20 bg-green-400/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-green-300">Ranked Arena</span>
        </header>

        {!searching ? (
          <>
            <section className="mt-4 overflow-hidden rounded-[26px] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.10] via-[#0c1929] to-purple-500/[0.10] p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-300">{rankData?.season?.title ?? (tr ? "Aktif Sezon" : "Active Season")}</p><h1 className="mt-1 text-2xl font-black">{tr ? "Ranked Arenası" : "Ranked Arena"}</h1></div>
                {me?.rankIcon ? <img src={me.rankIcon} alt="" className="h-16 w-16 object-contain" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">🏆</div>}
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div><p className="text-lg font-black">{me?.rankName ?? (tr ? "Bronz III" : "Bronze III")}</p><p className="text-3xl font-black text-yellow-300">{elo.toLocaleString(tr ? "tr-TR" : "en-US")} <span className="text-xs text-yellow-300/60">ELO</span></p></div>
                <div className="text-right text-[10px] font-bold text-slate-400"><p><span className="text-green-300">{me?.wins ?? 0}G</span> · <span className="text-red-300">{me?.losses ?? 0}M</span></p><p className="mt-1">Peak {Number(me?.peakElo ?? elo).toLocaleString()}</p></div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${Number(me?.progressPercent ?? 0)}%` }} /></div>
              <div className="mt-1.5 flex justify-between text-[9px] font-bold text-slate-500"><span>{me?.gamesPlayed ?? 0} {tr ? "ranked maç" : "ranked matches"}</span><span>{toNext !== null && me?.nextRankName ? `${me.nextRankName}: ${toNext} ELO` : "GOAT 🐐"}</span></div>
            </section>

            <section className="mt-4">
              <div className="flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-green-300">{tr ? "Maç Bul" : "Find Match"}</p><h2 className="mt-0.5 text-xl font-black">{tr ? "Oyununu seç" : "Choose your game"}</h2></div><span className="text-[9px] font-bold text-slate-600">{tr ? "ELO maçı" : "ELO match"}</span></div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {games.map(game => {
                  const active = selectedGame === game.code;
                  return <button key={game.code} type="button" onClick={() => setSelectedGame(game.code)} className={`min-h-[112px] rounded-2xl border p-2.5 text-left transition active:scale-[0.98] ${active ? "border-green-400/60 bg-green-500/10 shadow-[0_0_24px_rgba(74,222,128,0.08)]" : "border-white/10 bg-[#0c1929]"}`}><span className="text-2xl">{game.icon}</span><span className="mt-2 block text-[12px] font-black leading-tight">{tr ? game.tr : game.en}</span><span className="mt-1 block text-[9px] leading-tight text-slate-500">{tr ? game.shortTr : game.shortEn}</span></button>;
                })}
              </div>
              <button type="button" onClick={() => void startSearch()} className="mt-3 w-full rounded-2xl bg-green-400 px-4 py-3.5 text-[15px] font-black text-[#07111f] shadow-[0_8px_30px_rgba(74,222,128,0.14)] active:scale-[0.99]">⚔ {tr ? "RAKİP BUL" : "FIND OPPONENT"}</button>
              <Link href={`/${locale}/duels?quick=1&game=${selectedGame}`} className="mt-2 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-[#0c1929] px-4 py-3 text-[12px] font-black text-slate-300">🤝 {tr ? "Arkadaşına Düello Gönder" : "Challenge a Friend"}</Link>
              {matchMessage ? <p className="mt-2 text-center text-[10px] font-bold text-red-300">{matchMessage}</p> : null}
            </section>
          </>
        ) : (
          <section className="mt-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-green-300">{matched ? (tr ? "Rakip Bulundu" : "Opponent Found") : (tr ? "Eşleşme Aranıyor" : "Matchmaking")}</p>
            <h1 className="mt-2 text-2xl font-black">{tr ? selected.tr : selected.en}</h1>

            <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="rounded-3xl border border-green-400/25 bg-green-500/[0.07] p-4"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">👤</div><p className="mt-3 text-sm font-black">{tr ? "SEN" : "YOU"}</p><p className="mt-1 text-xs font-black text-yellow-300">{elo} ELO</p><p className="mt-1 text-[9px] text-slate-500">{me?.rankName ?? "Bronze III"}</p></div>
              <div><p className="text-xl font-black italic text-slate-500">VS</p>{!matched ? <div className="mx-auto mt-3 h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-green-400" /> : <p className="mt-2 text-lg">⚡</p>}</div>
              <div className={`rounded-3xl border p-4 ${matched ? "border-purple-400/35 bg-purple-500/[0.08]" : "border-white/10 bg-[#0c1929]"}`}><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">{matched?.opponent_kind === "bot" ? "🤖" : matched ? "👤" : "?"}</div><p className="mt-3 truncate text-sm font-black">{matched ? matchMessage : (tr ? "RAKİP" : "OPPONENT")}</p><p className="mt-1 text-[9px] text-slate-500">{matched?.opponent_kind === "bot" ? (tr ? "Antrenman Rakibi" : "Training Opponent") : matched ? (tr ? "Ranked Oyuncu" : "Ranked Player") : (tr ? "aranıyor..." : "searching...")}</p></div>
            </div>

            {matched ? <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-500/[0.06] p-3"><div className="mx-auto mb-2 h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-green-400" /><p className="text-sm font-black text-green-300">⚡ {selectedGame === "tic_tac_toe" ? (tr ? "GRID HAZIRLANIYOR..." : "PREPARING GRID...") : (tr ? "MAÇ BAŞLIYOR..." : "MATCH STARTING...")}</p>{matched.opponent_kind === "bot" ? <p className="mt-1 text-[10px] text-slate-500">{tr ? "Bot maçları ELO puanını etkilemez." : "Bot matches do not affect your ELO."}</p> : null}</div> : <><div className="mt-7 text-4xl font-black tabular-nums">00:{String(botCountdown ?? 10).padStart(2, "0")}</div><p className="mt-2 text-[10px] text-slate-500">{tr ? "Öncelik gerçek oyuncu. Süre dolarsa Bot Eren :) devreye girer." : "Real players first. Bot Eren :) joins when the timer ends."}</p><button type="button" onClick={() => void cancelSearch()} className="mt-6 rounded-2xl border border-white/10 px-5 py-3 text-[11px] font-black text-slate-400">{tr ? "ARAMAYI İPTAL ET" : "CANCEL SEARCH"}</button></>}
          </section>
        )}
      </div>
    </main>
  );
}
