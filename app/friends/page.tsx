"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Friend = {
  friendshipId: number;
  user: {
    id: string;
    username: string | null;
    displayName: string;
    totalScore: number;
    currentStreak: number;
    online?: boolean;
  };
};

type FriendsResponse = {
  ok?: boolean;
  error?: string;
  summary?: {
    friendCount: number;
    onlineFriendCount: number;
    incomingRequestCount: number;
  };
  friends?: Friend[];
};

type BoardEntry = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak?: number;
  level?: number;
};

type BoardResponse = {
  ok?: boolean;
  error?: string;
  leaderboard?: BoardEntry[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function rankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [summary, setSummary] = useState<FriendsResponse["summary"]>(undefined);
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [period, setPeriod] = useState<"week" | "all">("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [friendsRes, boardRes] = await Promise.all([
          fetch("/api/friends", { cache: "no-store" }),
          fetch(`/api/leaderboard?scope=friends&period=${period}&limit=100`, { cache: "no-store" }),
        ]);
        const friendsJson = (await friendsRes.json()) as FriendsResponse;
        const boardJson = (await boardRes.json()) as BoardResponse;
        if (!friendsRes.ok || !friendsJson.ok) throw new Error(friendsJson.error ?? "Arkadaşlar yüklenemedi.");
        if (!boardRes.ok || !boardJson.ok) throw new Error(boardJson.error ?? "Arkadaş sıralaması yüklenemedi.");
        if (!cancelled) {
          setFriends(friendsJson.friends ?? []);
          setSummary(friendsJson.summary);
          setBoard(boardJson.leaderboard ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Sosyal merkez yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [period]);

  return (
    <main className="min-h-[100dvh] bg-[#07111f] text-white">
      <header className="border-b border-white/10 bg-[#081523]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-black text-slate-400 hover:text-white">← Ana Sayfa</Link>
          <div className="text-center">
            <p className="font-black">FootBattle</p>
            <p className="text-xs text-slate-500">Sosyal Merkez</p>
          </div>
          <Link href="/profile" className="text-sm font-black text-green-300">Profil →</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="rounded-[28px] border border-purple-400/20 bg-gradient-to-br from-purple-400/[0.10] via-white/[0.035] to-green-400/[0.06] p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-300">Arkadaş Arenası</p>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">Arkadaşını geç, lafını yap.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Global sıralamadan bağımsız olarak sadece sen ve kabul edilmiş arkadaşların burada yarışır.</p>
            </div>
            <Link href="/friends/invite" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-5 text-sm font-black text-[#07111f]">+ Arkadaş Davet Et</Link>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-black">{summary?.friendCount ?? 0}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">Arkadaş</p>
          </div>
          <div className="rounded-2xl border border-green-400/15 bg-green-400/[0.04] p-4 text-center">
            <p className="text-2xl font-black text-green-300">{summary?.onlineFriendCount ?? 0}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">Çevrimiçi</p>
          </div>
          <Link href="/profile" className="rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.04] p-4 text-center">
            <p className="text-2xl font-black text-yellow-200">{summary?.incomingRequestCount ?? 0}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">Bekleyen İstek</p>
          </Link>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4 sm:px-6">
            <div>
              <h2 className="text-xl font-black">Arkadaş Sıralaması</h2>
              <p className="mt-1 text-sm text-slate-500">Anti-cheat onaylı skorlar</p>
            </div>
            <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
              <button type="button" onClick={() => setPeriod("week")} className={`rounded-lg px-3 py-2 text-xs font-black ${period === "week" ? "bg-yellow-400 text-[#07111f]" : "text-slate-400"}`}>Bu Hafta</button>
              <button type="button" onClick={() => setPeriod("all")} className={`rounded-lg px-3 py-2 text-xs font-black ${period === "all" ? "bg-yellow-400 text-[#07111f]" : "text-slate-400"}`}>Tüm Zamanlar</button>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">Yükleniyor...</div>
          ) : error ? (
            <div className="p-8 text-center font-bold text-red-300">{error}</div>
          ) : board.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-black">Henüz arkadaş sıralaması yok.</p>
              <p className="mt-2 text-sm text-slate-500">Bir arkadaş davet et veya birlikte oyun oynayın.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {board.map((entry) => {
                const winRate = entry.gamesPlayed ? Math.round((entry.gamesWon / entry.gamesPlayed) * 100) : 0;
                return (
                  <Link href={entry.username ? `/u/${encodeURIComponent(entry.username)}` : "/profile"} key={entry.userId} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 hover:bg-white/[0.035] sm:grid-cols-[64px_minmax(0,1fr)_160px] sm:px-6">
                    <div className="text-center text-lg font-black">{rankLabel(entry.rank)}</div>
                    <div className="min-w-0">
                      <p className="truncate font-black">{entry.displayName}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{entry.username ? `@${entry.username} · ` : ""}{entry.gamesPlayed} oyun · %{winRate} galibiyet · 🔥 {entry.currentStreak ?? 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-yellow-300">{formatNumber(entry.score)}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">puan</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {!loading && !error && friends.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Arkadaşların</h2>
              <Link href="/profile" className="text-xs font-black text-green-300">Yönet →</Link>
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {friends.map((friend) => (
                <Link key={friend.friendshipId} href={friend.user.username ? `/u/${encodeURIComponent(friend.user.username)}` : "/profile"} className="min-w-[180px] rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${friend.user.online ? "bg-green-400" : "bg-slate-600"}`} />
                    <p className="truncate font-black">{friend.user.displayName}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">🔥 {friend.user.currentStreak} · {formatNumber(friend.user.totalScore)} toplam puan</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
