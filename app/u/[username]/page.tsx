"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted" | "rejected";
type PublicUser = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  createdAt: string;
};
type GameResult = { id: number; game_code: string; play_date: string; score: number; won: boolean };
type UserResponse = {
  ok?: boolean;
  error?: string;
  isOwnProfile?: boolean;
  profile?: PublicUser;
  friendship?: { id: number | null; status: FriendshipStatus };
  results?: GameResult[];
};
type ActionResponse = { ok?: boolean; error?: string; friendship?: { id: number } };
type DuelGame = "tic_tac_toe" | "club_clash";

const GAME_LABELS: Record<string, string> = {
  wordle: "Wordle",
  guess_the_player: "Guess the Player",
  player_quiz: "Player Quiz",
  career_path: "Career Path",
  tic_tac_toe: "Futbol Tic Tac Toe",
  club_clash: "2 Takım 1 Oyuncu",
};

function formatNumber(value: number) { return new Intl.NumberFormat("tr-TR").format(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)); }
function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "FB"; }

export default function PublicUserPage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username ?? "").trim().replace(/^@/, "").toLowerCase();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [friendship, setFriendship] = useState<{ id: number | null; status: FriendshipStatus }>({ id: null, status: "none" });
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [duelOpen, setDuelOpen] = useState(false);
  const [duelSending, setDuelSending] = useState<DuelGame | null>(null);

  const loadProfile = useCallback(async (showLoading = true) => {
    if (!username) return;
    if (showLoading) setLoading(true);
    try {
      setError("");
      const response = await fetch(`/api/users/${encodeURIComponent(username)}`, { cache: "no-store" });
      const body = (await response.json()) as UserResponse;
      if (!response.ok || !body.ok || !body.profile) throw new Error(body.error ?? "Kullanıcı bulunamadı.");
      setProfile(body.profile);
      setResults(body.results ?? []);
      setFriendship(body.friendship ?? { id: null, status: "none" });
      setIsOwnProfile(Boolean(body.isOwnProfile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil yüklenemedi.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [username]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  async function friendAction(action: "send" | "remove" | "accept" | "reject") {
    if (!profile || actionLoading) return;
    setActionLoading(true); setError(""); setMessage("");
    try {
      let endpoint = "/api/friends/request";
      let body: Record<string, unknown> = { userId: profile.id };
      if (action === "remove") { endpoint = "/api/friends/remove"; body = { friendshipId: friendship.id }; }
      if (action === "accept" || action === "reject") { endpoint = "/api/friends/respond"; body = { friendshipId: friendship.id, action }; }
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await response.json()) as ActionResponse;
      if (!response.ok || !data.ok) throw new Error(data.error ?? "İşlem gerçekleştirilemedi.");
      setMessage(action === "send" ? "Arkadaşlık isteği gönderildi. ✅" : action === "accept" ? "Arkadaşlık isteği kabul edildi. 🤝" : action === "reject" ? "İstek reddedildi." : "Arkadaşlık güncellendi.");
      await loadProfile(false);
    } catch (err) { setError(err instanceof Error ? err.message : "İşlem gerçekleştirilemedi."); }
    finally { setActionLoading(false); }
  }

  async function sendDuel(gameCode: DuelGame) {
    if (!profile || friendship.status !== "accepted" || duelSending) return;
    setDuelSending(gameCode); setError("");
    try {
      const response = await fetch("/api/duels/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: profile.id, gameCode }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok || !body.duel?.id) throw new Error(body.error ?? "Düello gönderilemedi.");
      window.location.href = `/duels/${body.duel.id}`;
    } catch (err) { setError(err instanceof Error ? err.message : "Düello gönderilemedi."); }
    finally { setDuelSending(null); }
  }

  if (loading) return <main className="min-h-screen bg-[#07111f] p-8 text-center text-white"><p className="font-bold text-slate-400">Profil yükleniyor...</p></main>;
  if (!profile) return <main className="min-h-screen bg-[#07111f] px-5 py-8 text-white"><Link href="/" className="text-sm font-bold text-slate-300">← Ana Sayfa</Link><div className="mt-8 rounded-3xl border border-red-500/20 bg-[#101c2c] p-8 text-center"><h1 className="text-2xl font-black">Profil bulunamadı</h1><p className="mt-3 text-slate-400">{error}</p></div></main>;

  const gameSummaries = Object.entries(GAME_LABELS).map(([gameCode, label]) => {
    const rows = results.filter((r) => r.game_code === gameCode);
    return { gameCode, label, games: rows.length, wins: rows.filter((r) => r.won).length, totalScore: rows.reduce((sum, r) => sum + Number(r.score || 0), 0) };
  }).filter((x) => x.games > 0);

  return (
    <main className="min-h-screen bg-[#07111f] pb-28 text-white">
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">← Ana Sayfa</Link>
          <p className="font-black">FootBattle</p>
          <Link href="/profile" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">Profilim</Link>
        </header>

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-[#101c2c]">
          <div className="h-1 bg-green-400" />
          <div className="p-5 sm:p-7">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.displayName} className="h-24 w-24 rounded-3xl border border-green-400/30 object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-green-400/30 bg-green-500 text-2xl font-black text-[#07111f]">{initials(profile.displayName)}</div>}
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-400">FootBattle Oyuncusu</p>
                <h1 className="mt-2 truncate text-3xl font-black">{profile.displayName}</h1>
                {profile.username ? <p className="mt-1 font-bold text-slate-400">@{profile.username}</p> : null}
                <p className="mt-2 text-xs text-slate-600">Üyelik: {formatDate(profile.createdAt)}</p>
                {!isOwnProfile && friendship.status === "accepted" ? <span className="mt-3 inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-black text-green-300">✓ Arkadaşsınız</span> : null}
              </div>
            </div>

            {!isOwnProfile ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {friendship.status === "accepted" ? (
                  <>
                    <button type="button" onClick={() => setDuelOpen(true)} className="flex-1 rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f]">⚔ Düello Gönder</button>
                    <button type="button" disabled={actionLoading} onClick={() => void friendAction("remove")} className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-black text-red-300">Arkadaşlıktan Çıkar</button>
                  </>
                ) : friendship.status === "pending_sent" ? (
                  <button type="button" disabled={actionLoading} onClick={() => void friendAction("remove")} className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-3 text-sm font-black text-yellow-300">İsteği İptal Et</button>
                ) : friendship.status === "pending_received" ? (
                  <><button type="button" disabled={actionLoading} onClick={() => void friendAction("accept")} className="rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f]">Kabul Et</button><button type="button" disabled={actionLoading} onClick={() => void friendAction("reject")} className="rounded-xl border border-red-400/30 px-5 py-3 text-sm font-black text-red-300">Reddet</button></>
                ) : (
                  <button type="button" disabled={actionLoading} onClick={() => void friendAction("send")} className="rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f]">+ Arkadaş Ekle</button>
                )}
              </div>
            ) : <Link href="/profile" className="mt-5 inline-flex rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f]">Profilimi Yönet</Link>}
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-5">
            <Stat label="Toplam Puan" value={formatNumber(profile.totalScore)} />
            <Stat label="Güncel Seri" value={`${profile.currentStreak} 🔥`} />
            <Stat label="En İyi Seri" value={`${profile.bestStreak} gün`} />
            <Stat label="Oyun" value={formatNumber(profile.gamesPlayed)} />
            <Stat label="Kazanma" value={`%${profile.winRate}`} />
          </div>
        </section>

        {message || error ? <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${error ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-green-500/20 bg-green-500/10 text-green-300"}`}>{error || message}</div> : null}

        <section className="mt-7">
          <h2 className="text-xl font-black">Oyun Bazlı Performans</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {gameSummaries.length ? gameSummaries.map((game) => <article key={game.gameCode} className="rounded-2xl border border-white/10 bg-[#101c2c] p-4"><div className="flex justify-between gap-3"><div><h3 className="font-black">{game.label}</h3><p className="mt-1 text-xs text-slate-500">{game.games} oyun · {game.wins} galibiyet</p></div><span className="text-sm font-black text-yellow-300">{formatNumber(game.totalScore)} P</span></div></article>) : <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Henüz oyun sonucu yok.</p>}
          </div>
        </section>
      </div>

      {duelOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/75 p-3 sm:items-center sm:justify-center" onClick={() => setDuelOpen(false)}>
          <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#101c2c] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-green-300">⚔ {profile.displayName}</p><h2 className="mt-1 text-xl font-black">Hangi oyunda düello?</h2></div><button type="button" onClick={() => setDuelOpen(false)} className="h-9 w-9 rounded-full bg-white/5 text-slate-400">✕</button></div>
            <div className="mt-5 grid gap-3">
              <button type="button" disabled={duelSending !== null} onClick={() => void sendDuel("tic_tac_toe")} className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-left disabled:opacity-50"><p className="font-black">⭕ Futbol Tic Tac Toe</p><p className="mt-1 text-xs text-slate-400">Aynı grid, aynı süre.</p></button>
              <button type="button" disabled={duelSending !== null} onClick={() => void sendDuel("club_clash")} className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-left disabled:opacity-50"><p className="font-black">⚽ 2 Takım 1 Oyuncu</p><p className="mt-1 text-xs text-slate-400">Ortak oyuncuyu rakibinden önce bul.</p></button>
            </div>
            {duelSending ? <p className="mt-3 text-center text-xs font-bold text-green-300">Düello oluşturuluyor...</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#0c1929] p-4 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>;
}
