"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n/config";

type Profile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_score: number;
  current_streak: number;
  games_played: number;
  games_won: number;
  is_admin: boolean;
};

type Rank = { rankName: string; rankIcon: string; lp: number; position?: number | null };
type Friend = { friendshipId: number; user: { id: string; username: string | null; displayName: string; avatarUrl: string | null; online?: boolean; lastSeenText?: string; totalScore?: number } };
type FriendsResponse = { ok?: boolean; summary?: { friendCount?: number; onlineFriendCount?: number }; friends?: Friend[] };
type RankResponse = { ok?: boolean; me?: Rank | null };

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FB";
}

export default function MobileProfilePage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rank, setRank] = useState<Rank | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const nf = useMemo(() => new Intl.NumberFormat(tr ? "tr-TR" : "en-US"), [tr]);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = `/login?next=/${locale}/profile`;
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("username,display_name,avatar_url,total_score,current_streak,games_played,games_won,is_admin")
          .eq("id", user.id)
          .maybeSingle();
        if (data) setProfile(data as Profile);

        const [rankResponse, friendsResponse] = await Promise.all([
          fetch("/api/rank/leaderboard", { cache: "no-store" }),
          fetch("/api/friends", { cache: "no-store" }),
        ]);
        const rankData = (await rankResponse.json()) as RankResponse;
        const friendsData = (await friendsResponse.json()) as FriendsResponse;
        if (rankResponse.ok && rankData.ok) setRank(rankData.me ?? null);
        if (friendsResponse.ok && friendsData.ok) {
          setFriends(friendsData.friends ?? []);
          setFriendCount(Number(friendsData.summary?.friendCount ?? friendsData.friends?.length ?? 0));
          setOnlineCount(Number(friendsData.summary?.onlineFriendCount ?? 0));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [locale]);

  if (loading || !profile) {
    return <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white"><p className="text-sm text-slate-500">{tr ? "Profil hazırlanıyor..." : "Preparing profile..."}</p></main>;
  }

  const displayName = profile.display_name || profile.username || "FootBattle";
  const winRate = profile.games_played ? Math.round((profile.games_won / profile.games_played) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">FootBattle</p>
          <div className="flex items-center gap-3">
            {profile.is_admin ? <Link href="/admin" className="rounded-lg border border-purple-400/20 bg-purple-400/10 px-2.5 py-1.5 text-[10px] font-black text-purple-200">⚙ Admin</Link> : null}
            <Link href={`/${locale}/rank`} className="text-[11px] font-black text-green-300">{tr ? "Sıralama →" : "Rank →"}</Link>
          </div>
        </div>

        <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <div className="grid grid-cols-[64px_minmax(0,1fr)_92px] items-center gap-3">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={displayName} className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-xl font-black text-green-200">{initials(displayName)}</div>}
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-green-300">{tr ? "Profilim" : "My Profile"}</p>
              <h1 className="mt-1 truncate text-xl font-black">{displayName}</h1>
              {profile.username ? <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">@{profile.username}</p> : null}
              <p className="mt-2 text-[11px] font-bold text-orange-300">🔥 {profile.current_streak} {tr ? "gün seri" : "day streak"}</p>
            </div>
            {rank ? <Link href={`/${locale}/rank`} className="rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.05] p-2 text-center"><img src={rank.rankIcon} alt={rank.rankName} className="mx-auto h-10 w-10 object-contain" /><p className="mt-1 truncate text-[10px] font-black text-yellow-200">{rank.rankName.replace(" III", "")}</p><p className="mt-0.5 text-[9px] font-black text-green-300">{nf.format(rank.lp)} LP</p></Link> : <div />}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <MiniStat label={tr ? "Skor" : "Score"} value={nf.format(profile.total_score)} />
            <MiniStat label={tr ? "Oyun" : "Games"} value={nf.format(profile.games_played)} />
            <MiniStat label={tr ? "Galibiyet" : "Wins"} value={nf.format(profile.games_won)} />
            <MiniStat label={tr ? "Kazanma" : "Win rate"} value={`%${winRate}`} />
          </div>
        </section>

        <section className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-green-300">Social</p><h2 className="mt-1 text-xl font-black">{tr ? "Arkadaşlar" : "Friends"}</h2></div>
            <p className="text-[10px] font-bold text-slate-500">{friendCount} {tr ? "arkadaş" : "friends"} · {onlineCount} {tr ? "çevrimiçi" : "online"}</p>
          </div>

          <div className="mt-3 space-y-2">
            {friends.length ? friends.slice(0, 8).map((item) => {
              const content = <><div className="relative">{item.user.avatarUrl ? <img src={item.user.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-xs font-black text-green-200">{initials(item.user.displayName)}</div>}<span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#07111f] ${item.user.online ? "bg-green-400" : "bg-slate-600"}`} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item.user.displayName}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{item.user.username ? `@${item.user.username}` : item.user.lastSeenText || (tr ? "FootBattle oyuncusu" : "FootBattle player")}</p></div><span className="text-[10px] font-black text-slate-400">{nf.format(Number(item.user.totalScore ?? 0))}</span></>;
              return item.user.username ? <Link key={item.friendshipId} href={`/u/${encodeURIComponent(item.user.username)}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 active:bg-white/[0.06]">{content}</Link> : <article key={item.friendshipId} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">{content}</article>;
            }) : <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-xs text-slate-500">{tr ? "Henüz arkadaşın yok." : "No friends yet."}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[0.07] bg-[#07111f] px-2 py-2.5 text-center"><p className="truncate text-sm font-black">{value}</p><p className="mt-1 truncate text-[8px] font-black uppercase tracking-wider text-slate-600">{label}</p></div>;
}
