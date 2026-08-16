"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n/config";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_score: number;
  current_streak: number;
  best_streak: number;
  games_played: number;
  games_won: number;
};

type FriendUser = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  currentStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  online?: boolean;
  lastSeenText?: string;
};

type FriendListItem = { friendshipId: number; user: FriendUser };
type IncomingRequest = { friendshipId: number; user: FriendUser };
type FriendsData = {
  ok?: boolean;
  error?: string;
  summary?: { friendCount: number; onlineFriendCount: number; incomingRequestCount: number };
  friends?: FriendListItem[];
  incomingRequests?: IncomingRequest[];
};
type SearchUser = FriendUser & { friendship: { id: number | null; status: "none" | "pending_sent" | "pending_received" | "accepted" | "rejected" } };
type SearchData = { ok?: boolean; error?: string; users?: SearchUser[] };
type RankEntry = { rankName: string; rankIcon: string; lp: number; progressPercent: number; nextRankName?: string | null; nextRankLp?: number | null; position?: number | null };
type RankData = { ok?: boolean; me?: RankEntry | null; season?: { title: string } | null };

const copy = {
  tr: {
    home: "← Ana Sayfa", title: "Profilim", subtitle: "Skorunu, rankını ve arkadaş rekabetini tek yerde takip et.",
    score: "Toplam Skor", games: "Oyun", wins: "Galibiyet", streak: "Güncel Seri", rank: "Rankın", next: "Sıradaki", season: "Sezon", position: "Sıra",
    friends: "Arkadaşlar", online: "çevrimiçi", requests: "Gelen İstekler", accept: "Kabul Et", reject: "Reddet", noRequests: "Bekleyen arkadaşlık isteğin yok.",
    find: "Arkadaş Bul", placeholder: "Kullanıcı adı veya isim ara...", searching: "Aranıyor...", add: "Arkadaş Ekle", sent: "İstek Gönderildi", already: "Arkadaşsınız", received: "Sana istek gönderdi", noFriends: "Henüz arkadaşın yok. İlk rakibini bul!",
    loading: "Profil hazırlanıyor...", error: "Profil yüklenemedi.", login: "Giriş yapmalısın.", logout: "Çıkış Yap", share: "Profilimi Paylaş", copied: "Profil linki kopyalandı ✓",
    added: "Arkadaşlık isteği gönderildi. ✅", accepted: "Arkadaşlık isteği kabul edildi. ✅", rejected: "Arkadaşlık isteği reddedildi.", winRate: "Kazanma Oranı",
  },
  en: {
    home: "← Home", title: "My Profile", subtitle: "Track your score, rank and friend rivalries in one place.",
    score: "Total Score", games: "Games", wins: "Wins", streak: "Current Streak", rank: "Your Rank", next: "Next", season: "Season", position: "Position",
    friends: "Friends", online: "online", requests: "Friend Requests", accept: "Accept", reject: "Reject", noRequests: "You have no pending friend requests.",
    find: "Find Friends", placeholder: "Search username or name...", searching: "Searching...", add: "Add Friend", sent: "Request Sent", already: "Friends", received: "Sent you a request", noFriends: "No friends yet. Find your first rival!",
    loading: "Preparing profile...", error: "Profile could not be loaded.", login: "You need to sign in.", logout: "Sign Out", share: "Share Profile", copied: "Profile link copied ✓",
    added: "Friend request sent. ✅", accepted: "Friend request accepted. ✅", rejected: "Friend request rejected.", winRate: "Win Rate",
  },
} as const;

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FB";
}

export default function LocalizedProfilePage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rank, setRank] = useState<RankData | null>(null);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [summary, setSummary] = useState({ friendCount: 0, onlineFriendCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const nf = useMemo(() => new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US"), [locale]);

  const loadFriends = useCallback(async () => {
    const response = await fetch("/api/friends", { cache: "no-store" });
    const data = (await response.json()) as FriendsData;
    if (!response.ok || !data.ok) throw new Error(data.error ?? t.error);
    setFriends(data.friends ?? []);
    setRequests(data.incomingRequests ?? []);
    setSummary({
      friendCount: data.summary?.friendCount ?? data.friends?.length ?? 0,
      onlineFriendCount: data.summary?.onlineFriendCount ?? (data.friends ?? []).filter((item) => item.user.online).length,
    });
  }, [t.error]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = `/login?next=/${locale}/profile`;
          return;
        }
        const { data, error: profileError } = await supabase.from("profiles")
          .select("id,username,display_name,avatar_url,total_score,current_streak,best_streak,games_played,games_won")
          .eq("id", user.id).maybeSingle();
        if (profileError || !data) throw profileError ?? new Error(t.error);
        setProfile(data as Profile);
        const [rankResponse] = await Promise.all([
          fetch("/api/rank/leaderboard", { cache: "no-store" }),
          loadFriends(),
        ]);
        setRank((await rankResponse.json()) as RankData);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : t.error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [loadFriends, locale, t.error]);

  useEffect(() => {
    const clean = query.trim().replace(/^@/, "");
    if (clean.length < 2) { setResults([]); setSearching(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/friends/search?q=${encodeURIComponent(clean)}`, { cache: "no-store", signal: controller.signal });
        const data = (await response.json()) as SearchData;
        if (!response.ok || !data.ok) throw new Error(data.error ?? t.error);
        setResults(data.users ?? []);
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setMessage(reason instanceof Error ? reason.message : t.error);
      } finally { setSearching(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, t.error]);

  async function addFriend(userId: string) {
    try {
      setBusyId(userId); setMessage("");
      const response = await fetch("/api/friends/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? t.error);
      setResults((current) => current.map((item) => item.id === userId ? { ...item, friendship: { id: data.friendship?.id ?? null, status: "pending_sent" } } : item));
      setMessage(t.added);
      await loadFriends();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : t.error); }
    finally { setBusyId(null); }
  }

  async function respond(friendshipId: number, action: "accept" | "reject") {
    try {
      setBusyId(friendshipId); setMessage("");
      const response = await fetch("/api/friends/respond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendshipId, action }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? t.error);
      setMessage(action === "accept" ? t.accepted : t.rejected);
      await loadFriends();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : t.error); }
    finally { setBusyId(null); }
  }

  async function shareProfile() {
    const url = `${window.location.origin}/${locale}/profile`;
    try {
      if (navigator.share) await navigator.share({ title: "FootBattle", url });
      else { await navigator.clipboard.writeText(url); setMessage(t.copied); }
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) setMessage(t.error);
    }
  }

  async function logout() {
    await createClient().auth.signOut();
    window.location.href = `/${locale}`;
  }

  if (loading) return <main className="min-h-screen bg-[#07111f] p-8 text-white"><p className="text-slate-400">{t.loading}</p></main>;
  if (error || !profile) return <main className="min-h-screen bg-[#07111f] p-8 text-white"><p className="text-red-300">{error || t.error}</p></main>;

  const displayName = profile.display_name || profile.username || "FootBattle";
  const winRate = profile.games_played > 0 ? Math.round((profile.games_won / profile.games_played) * 100) : 0;
  const me = rank?.me;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/${locale}`} className="text-sm font-black text-slate-400 hover:text-white">{t.home}</Link>
          <div className="flex gap-2">
            <button type="button" onClick={() => void shareProfile()} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-green-300">{t.share}</button>
            <button type="button" onClick={() => void logout()} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-slate-400">{t.logout}</button>
          </div>
        </div>

        <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {profile.avatar_url ? <Image src={profile.avatar_url} alt={displayName} width={112} height={112} className="h-24 w-24 rounded-3xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-green-400/10 text-3xl font-black text-green-200">{initials(displayName)}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">{t.title}</p>
              <h1 className="mt-2 truncate text-3xl font-black sm:text-5xl">{displayName}</h1>
              {profile.username && <p className="mt-1 text-sm font-bold text-slate-500">@{profile.username}</p>}
              <p className="mt-3 text-sm text-slate-400">{t.subtitle}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              [t.score, nf.format(profile.total_score)], [t.games, nf.format(profile.games_played)], [t.wins, nf.format(profile.games_won)], [t.winRate, `%${winRate}`], [t.streak, `🔥 ${profile.current_streak}`],
            ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#07111f] p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}
          </div>
        </section>

        {me && (
          <Link href={`/${locale}/rank`} className="mt-5 block rounded-3xl border border-yellow-300/20 bg-yellow-300/[0.055] p-5 transition hover:border-yellow-300/35">
            <div className="flex items-center gap-4">
              <Image src={me.rankIcon} alt={me.rankName} width={88} height={88} className="h-20 w-20 object-contain" />
              <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wider text-yellow-300">{t.rank}</p><div className="mt-1 flex flex-wrap items-baseline gap-2"><h2 className="text-2xl font-black">{me.rankName}</h2><span className="font-black text-green-300">{nf.format(me.lp)} LP</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-300" style={{ width: `${me.progressPercent}%` }} /></div><p className="mt-2 text-xs text-slate-500">{me.nextRankName ? `${t.next}: ${me.nextRankName} · ${nf.format(me.nextRankLp ?? 0)} LP` : "GOAT"}{me.position ? ` · ${t.position} #${me.position}` : ""}</p></div>
            </div>
          </Link>
        )}

        {message && <div className="mt-5 rounded-2xl border border-green-400/15 bg-green-400/[0.055] px-4 py-3 text-sm font-bold text-green-200">{message}</div>}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-green-300">Social</p><h2 className="mt-1 text-2xl font-black">{t.friends}</h2></div><p className="text-xs font-bold text-slate-500">{summary.friendCount} · {summary.onlineFriendCount} {t.online}</p></div>
            {friends.length === 0 ? <p className="mt-5 rounded-2xl border border-white/[0.07] p-5 text-sm text-slate-500">{t.noFriends}</p> : <div className="mt-4 space-y-2">{friends.map(({ friendshipId, user }) => <div key={friendshipId} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#07111f] p-3"><div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-sm font-black">{initials(user.displayName)}{user.online && <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#07111f] bg-green-400" />}</div><div className="min-w-0 flex-1"><p className="truncate font-black">{user.displayName}</p><p className="truncate text-xs text-slate-500">{user.username ? `@${user.username}` : user.lastSeenText ?? ""}</p></div><p className="text-xs font-black text-yellow-300">{nf.format(user.totalScore)}</p></div>)}</div>}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-wider text-purple-300">Inbox</p><h2 className="mt-1 text-2xl font-black">{t.requests}</h2>
            {requests.length === 0 ? <p className="mt-5 rounded-2xl border border-white/[0.07] p-5 text-sm text-slate-500">{t.noRequests}</p> : <div className="mt-4 space-y-3">{requests.map(({ friendshipId, user }) => <div key={friendshipId} className="rounded-2xl border border-white/[0.07] bg-[#07111f] p-4"><p className="font-black">{user.displayName}</p><p className="text-xs text-slate-500">{user.username ? `@${user.username}` : ""}</p><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={busyId === friendshipId} onClick={() => void respond(friendshipId, "accept")} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-[#07111f] disabled:opacity-50">{t.accept}</button><button disabled={busyId === friendshipId} onClick={() => void respond(friendshipId, "reject")} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 disabled:opacity-50">{t.reject}</button></div></div>)}</div>}
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-blue-300">FootBattle Network</p><h2 className="mt-1 text-2xl font-black">{t.find}</h2>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.placeholder} className="mt-4 min-h-12 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 text-sm outline-none focus:border-green-400/40" />
          {searching && <p className="mt-3 text-xs font-bold text-slate-500">{t.searching}</p>}
          <div className="mt-3 grid gap-2 md:grid-cols-2">{results.map((user) => <div key={user.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#07111f] p-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-sm font-black">{initials(user.displayName)}</div><div className="min-w-0 flex-1"><p className="truncate font-black">{user.displayName}</p><p className="truncate text-xs text-slate-500">{user.username ? `@${user.username}` : ""}</p></div>{user.friendship.status === "none" || user.friendship.status === "rejected" ? <button disabled={busyId === user.id} onClick={() => void addFriend(user.id)} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-[#07111f] disabled:opacity-50">{t.add}</button> : <span className="max-w-28 text-right text-[10px] font-black text-slate-500">{user.friendship.status === "accepted" ? t.already : user.friendship.status === "pending_received" ? t.received : t.sent}</span>}</div>)}</div>
        </section>
      </div>
    </main>
  );
}
