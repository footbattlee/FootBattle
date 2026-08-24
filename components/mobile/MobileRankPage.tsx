"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type RankEntry = {
  position: number | null;
  userId: string;
  username?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  lp: number;
  rankName: string;
  rankIcon: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
};
type RankData = { ok?: boolean; error?: string; season?: { title?: string } | null; leaderboard?: RankEntry[]; me?: RankEntry | null };
type SoloEntry = {
  position: number | null;
  userId: string;
  username?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  rating: number;
  gamesPlayed: number;
  gamesCount: number;
  wins: number;
};
type SoloData = { ok?: boolean; error?: string; leaderboard?: SoloEntry[]; me?: SoloEntry | null };
type Friend = { user: { id: string; username: string | null; displayName: string; avatarUrl?: string | null } };
type FriendsData = { ok?: boolean; friends?: Friend[] };
type GameCode = "tic_tac_toe" | "club_clash" | "club_nation";
type MatchmakingResponse = {
  ok?: boolean;
  error?: string;
  state?: "searching" | "matched";
  elapsedMs?: number;
  botInMs?: number;
  match?: { id: string; game_code: GameCode; opponent_kind: "human" | "bot"; bot_name?: string | null };
};

const games: Array<{ code: GameCode; icon: string; tr: string; en: string; descTr: string; descEn: string }> = [
  { code: "tic_tac_toe", icon: "⭕", tr: "Futbol Tic Tac Toe", en: "Football Tic Tac Toe", descTr: "Düellodaki aynı 3x3 mekanik.", descEn: "The same 3x3 duel rules." },
  { code: "club_clash", icon: "⚽", tr: "2 Takım 1 Oyuncu", en: "2 Clubs 1 Player", descTr: "İlk 3 roundu alan kazanır.", descEn: "First to 3 rounds wins." },
  { code: "club_nation", icon: "🌍", tr: "1 Takım 1 Millet", en: "1 Club 1 Nation", descTr: "İlk 3 roundu alan kazanır.", descEn: "First to 3 rounds wins." },
];

export default function MobileRankPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const router = useRouter();
  const [scope, setScope] = useState<"global" | "friends">("global");
  const [leaderboardMode, setLeaderboardMode] = useState<"ranked" | "solo">("ranked");
  const [rank, setRank] = useState<RankData | null>(null);
  const [solo, setSolo] = useState<SoloData | null>(null);
  const [friends, setFriends] = useState<FriendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameCode>("tic_tac_toe");
  const [searching, setSearching] = useState(false);
  const [matchMessage, setMatchMessage] = useState("");
  const [botCountdown, setBotCountdown] = useState<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const nf = useMemo(() => new Intl.NumberFormat(tr ? "tr-TR" : "en-US"), [tr]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/rank/leaderboard", { cache: "no-store" }).then((r) => r.json() as Promise<RankData>),
      fetch("/api/solo/leaderboard", { cache: "no-store" }).then((r) => r.json() as Promise<SoloData>).catch(() => ({ ok: false, leaderboard: [] })),
      fetch("/api/friends", { cache: "no-store" }).then(async (r) => r.ok ? (r.json() as Promise<FriendsData>) : ({ ok: false } as FriendsData)),
    ]).then(([rankData, soloData, friendData]) => {
      setRank(rankData);
      setSolo(soloData);
      setFriends(friendData);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#leaderboard") return;
    const timer = window.setTimeout(() => {
      document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

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
    if (!response.ok || !result.ok) throw new Error(result.error ?? (tr ? "Rakip aranamadı." : "Could not search for an opponent."));

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
    try { await matchmakingTick(selectedGame); } catch (error) { handleMatchError(error); }
  }

  async function cancelSearch() {
    if (pollRef.current) window.clearTimeout(pollRef.current);
    pollRef.current = null;
    await fetch(matchmakingEndpoint(selectedGame), { method: "DELETE" }).catch(() => null);
    setSearching(false);
    setBotCountdown(null);
    setMatchMessage("");
  }

  const friendIds = new Set((friends?.friends ?? []).map((item) => item.user.id));
  if (rank?.me?.userId) friendIds.add(rank.me.userId);
  if (solo?.me?.userId) friendIds.add(solo.me.userId);

  const rankedGlobal = rank?.leaderboard ?? [];
  const rankedFriends = rankedGlobal.filter((entry) => friendIds.has(entry.userId));
  if (rank?.me && !rankedFriends.some((entry) => entry.userId === rank.me?.userId)) rankedFriends.push(rank.me);
  rankedFriends.sort((a, b) => Number(b.lp ?? 0) - Number(a.lp ?? 0));

  const soloGlobal = solo?.leaderboard ?? [];
  const soloFriends = soloGlobal.filter((entry) => friendIds.has(entry.userId));
  if (solo?.me && !soloFriends.some((entry) => entry.userId === solo.me?.userId)) soloFriends.push(solo.me);
  soloFriends.sort((a, b) => Number(b.rating ?? 1000) - Number(a.rating ?? 1000));

  const rankedEntries = scope === "global" ? rankedGlobal : rankedFriends;
  const soloEntries = scope === "global" ? soloGlobal : soloFriends;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-xl">
        <header>
          <Link href={`/${locale}`} aria-label="FootBattle" className="inline-flex">
            <img src="/footbattle-logo.png" alt="FootBattle" className="h-9 w-auto object-contain" />
          </Link>
          <div className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">FootBattle Ranked</p>
            <h1 className="mt-1 text-3xl font-black">{tr ? "Ranked Maç" : "Ranked Match"}</h1>
            <p className="mt-1 text-xs text-slate-500">{tr ? "Oyunu seç, rakibini bul ve direkt maça gir." : "Pick a game, find an opponent and jump straight in."}</p>
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-green-500/20 bg-green-500/[0.055] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">{tr ? "Maç Bul" : "Find Match"}</p>
              <h2 className="mt-1 text-xl font-black">{tr ? "Oyununu seç" : "Choose your game"}</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black text-slate-400">BETA</span>
          </div>

          <div className="mt-4 grid gap-3">
            {games.map((game) => {
              const selected = selectedGame === game.code;
              return <button key={game.code} type="button" disabled={searching} onClick={() => setSelectedGame(game.code)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-green-400/60 bg-green-500/10" : "border-white/10 bg-[#0c1929]"}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/20 text-xl">{game.icon}</span>
                <span className="min-w-0 flex-1"><span className="block font-black">{tr ? game.tr : game.en}</span><span className="mt-0.5 block text-[11px] text-slate-500">{tr ? game.descTr : game.descEn}</span></span>
                <span className={`text-lg ${selected ? "text-green-300" : "text-slate-700"}`}>●</span>
              </button>;
            })}
          </div>

          {!searching ? (
            <button type="button" onClick={() => void startSearch()} className="mt-4 w-full rounded-2xl bg-green-500 px-5 py-4 font-black text-[#07111f] active:scale-[0.99]">
              🔎 {tr ? "Rakip Ara" : "Find Opponent"}
            </button>
          ) : (
            <div className="mt-4 rounded-2xl border border-purple-400/20 bg-purple-500/[0.08] p-4 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-purple-400" />
              <p className="mt-3 font-black">{matchMessage}</p>
              {botCountdown !== null && botCountdown > 0 && <p className="mt-1 text-xs text-slate-500">{tr ? `${botCountdown} sn içinde oyuncu bulunmazsa Bot Eren :) devreye girer.` : `Bot Eren :) joins in ${botCountdown}s if no player is found.`}</p>}
              <button type="button" onClick={() => void cancelSearch()} className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-slate-400">{tr ? "Aramayı İptal Et" : "Cancel"}</button>
            </div>
          )}
          {!searching && matchMessage && <p className="mt-3 text-center text-xs font-bold text-red-300">{matchMessage}</p>}
        </section>

        <div id="leaderboard" className="scroll-mt-6 mt-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">{tr ? "Sıralama" : "Leaderboard"}</p>
          <h2 className="mt-1 text-2xl font-black">{tr ? "FootBattle Sıralaması" : "FootBattle Leaderboard"}</h2>
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1">
          <button type="button" onClick={() => setLeaderboardMode("ranked")} className={`rounded-xl px-3 py-3 text-xs font-black ${leaderboardMode === "ranked" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>🏆 Ranked</button>
          <button type="button" onClick={() => setLeaderboardMode("solo")} className={`rounded-xl px-3 py-3 text-xs font-black ${leaderboardMode === "solo" ? "bg-yellow-400 text-[#07111f]" : "text-slate-500"}`}>🎮 Solo</button>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">{leaderboardMode === "ranked" ? (rank?.season?.title ?? (tr ? "Ranked ELO" : "Ranked ELO")) : (tr ? "Solo Rating" : "Solo Rating")}</h3>
            <p className="mt-1 text-[10px] text-slate-500">{leaderboardMode === "ranked"
              ? (tr ? "Yalnızca gerçek oyuncular arasındaki Ranked maçlar." : "Ranked matches between real players only.")
              : (tr ? "Solo oyunlarda performans + oyun çeşitliliği. Oynama sayısı tek başına avantaj sağlamaz." : "Solo performance + game variety. Grinding alone does not give an advantage.")}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1">
          <button onClick={() => setScope("global")} className={`rounded-xl px-3 py-2.5 text-xs font-black ${scope === "global" ? "bg-white/10 text-white" : "text-slate-500"}`}>{tr ? "🌍 Genel" : "🌍 Global"}</button>
          <button onClick={() => setScope("friends")} className={`rounded-xl px-3 py-2.5 text-xs font-black ${scope === "friends" ? "bg-white/10 text-white" : "text-slate-500"}`}>{tr ? "👥 Arkadaşlar" : "👥 Friends"}</button>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {loading ? <p className="p-8 text-center text-sm text-slate-500">{tr ? "Yükleniyor..." : "Loading..."}</p> : leaderboardMode === "ranked" ? (
            rankedEntries.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{scope === "friends" ? (tr ? "Ranked sıralamasında görünen arkadaşın yok." : "No ranked friends yet.") : (tr ? "Ranked sıralaması boş." : "Ranked leaderboard is empty.")}</p> :
            <div className="divide-y divide-white/[0.06]">
              {rankedEntries.map((entry, index) => {
                const position = scope === "global" ? entry.position : index + 1;
                const content = <>
                  <span className="w-7 shrink-0 text-center text-xs font-black">#{position ?? "-"}</span>
                  <img src={entry.rankIcon} alt={entry.rankName} className="h-10 w-10 shrink-0 object-contain" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{entry.displayName ?? entry.username ?? "FootBattle"}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{entry.rankName} · {entry.gamesPlayed} {tr ? "maç" : "matches"} · {entry.wins}G/{entry.losses}M</p></div>
                  <div className="shrink-0 text-right"><p className="text-sm font-black text-green-300">{nf.format(entry.lp)}</p><p className="text-[8px] font-black text-slate-600">ELO</p></div>
                </>;
                return entry.username ? <Link key={entry.userId} href={`/u/${encodeURIComponent(entry.username)}`} className="flex items-center gap-2.5 px-3 py-3 active:bg-white/[0.04]">{content}</Link> : <div key={entry.userId} className="flex items-center gap-2.5 px-3 py-3">{content}</div>;
              })}
            </div>
          ) : (
            soloEntries.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{scope === "friends" ? (tr ? "Solo sıralamasında görünen arkadaşın yok." : "No solo-ranked friends yet.") : (tr ? "Solo sıralaması henüz boş." : "Solo leaderboard is empty.")}</p> :
            <div className="divide-y divide-white/[0.06]">
              {soloEntries.map((entry, index) => {
                const position = scope === "global" ? entry.position : index + 1;
                const content = <>
                  <span className="w-7 shrink-0 text-center text-xs font-black">#{position ?? "-"}</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-xl">🎮</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{entry.displayName ?? entry.username ?? "FootBattle"}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{entry.gamesCount} {tr ? "oyun türü" : "game types"} · {entry.gamesPlayed} {tr ? "oyun" : "games"} · {entry.wins} {tr ? "başarı" : "wins"}</p></div>
                  <div className="shrink-0 text-right"><p className="text-sm font-black text-yellow-300">{nf.format(entry.rating)}</p><p className="text-[8px] font-black text-slate-600">RATING</p></div>
                </>;
                return entry.username ? <Link key={entry.userId} href={`/u/${encodeURIComponent(entry.username)}`} className="flex items-center gap-2.5 px-3 py-3 active:bg-white/[0.04]">{content}</Link> : <div key={entry.userId} className="flex items-center gap-2.5 px-3 py-3">{content}</div>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}