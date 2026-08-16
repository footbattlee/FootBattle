"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import LeaderboardCard from "@/components/LeaderboardCard";
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

type HomeUser = { id: string; email?: string };

type FriendUser = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  currentStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  online: boolean;
  lastSeenAt: string | null;
  lastSeenText: string;
};

type FriendItem = { friendshipId: number; since: string | null; user: FriendUser };
type FriendsResponse = {
  ok?: boolean;
  error?: string;
  summary?: { friendCount: number; onlineFriendCount: number; incomingRequestCount?: number };
  friends?: FriendItem[];
};

type DailyChallengeProgress = {
  guessThePlayer: boolean;
  playerQuiz: boolean;
  ticTacToe: boolean;
  wordle: boolean;
};

type DailyChallengeAttempted = DailyChallengeProgress;
type DailyChallengeNextGame = { code: string; label: string; href: string };
type DailyChallengeResponse = {
  ok?: boolean;
  authenticated?: boolean;
  error?: string;
  challengeDate?: string;
  required?: number;
  totalGames?: number;
  completedCount?: number;
  challengeCompleted?: boolean;
  perfectCompleted?: boolean;
  reward?: number;
  rewardClaimed?: boolean;
  progress?: DailyChallengeProgress;
  attempted?: DailyChallengeAttempted;
  nextGame?: DailyChallengeNextGame | null;
};

type GameMode = "solo" | "duel" | "both";
type GameItem = {
  code: string;
  title: string;
  description: string;
  heroDescription: string;
  icon: string;
  mode: GameMode;
  ready: boolean;
  playHref?: string;
  duelHref?: string;
};

type Copy = ReturnType<typeof getCopy>;

function localeHref(locale: Locale, path: string, localized = false) {
  return localized ? `/${locale}${path}` : path;
}

function getCopy(locale: Locale) {
  const tr = locale === "tr";
  return {
    tr,
    nav: {
      home: tr ? "Ana Sayfa" : "Home",
      games: tr ? "Oyunlar" : "Games",
      squad: tr ? "Kadro Kur" : "Build Squad",
      pickup: tr ? "Halısaha Kadro" : "Pickup Squad",
      profile: tr ? "Profil" : "Profile",
      logout: tr ? "Çıkış" : "Sign Out",
      login: tr ? "Giriş Yap" : "Sign In",
    },
    daily: {
      eyebrow: tr ? "HER GÜN GERİ DÖN" : "COME BACK EVERY DAY",
      title: tr ? "Bugünün görevi ve arena sıralaması" : "Today's mission and arena leaderboard",
      text: tr
        ? "Dört günlük oyundan üçünü tamamla, bonus puanı kap. Dördünü de bitirirsen ekstra ödül kazan."
        : "Complete three of the four daily games to earn bonus points. Finish all four for an extra reward.",
      cardEyebrow: tr ? "🔥 Bugünün FootBattle'ı" : "🔥 Today's FootBattle",
      cardTitle: tr ? "Günlük görevini tamamla" : "Complete your daily mission",
      cardText: tr
        ? "4 oyundan 3'ünü kazan ve 250 bonus puan al. 4/4 yaparsan günlük ödülün 350 puana çıkar."
        : "Win 3 of 4 games to earn 250 bonus points. Go 4/4 and your daily reward rises to 350 points.",
      start: tr ? "Giriş Yap ve Göreve Başla" : "Sign In and Start Mission",
      loading: tr ? "Görev yükleniyor..." : "Loading mission...",
      success: tr ? "Başarılı" : "Wins",
      gamesPlayed: tr ? "oyun oynandı" : "games played",
      wins: tr ? "galibiyet" : "wins",
      won: tr ? "Kazandın" : "Won",
      used: tr ? "Bu günlük hak kullanıldı" : "Daily attempt used",
      result: tr ? "Bugünün Sonucu" : "Today's Result",
      share: tr ? "📤 Sonucu Paylaş" : "📤 Share Result",
      begin: tr ? "Göreve Başla" : "Start Mission",
      continue: tr ? "Devam Et" : "Continue",
      ready: tr ? "🏁 Günlük görev sonucu hazır" : "🏁 Daily mission result ready",
      done: tr ? "🏁 Bugünkü 4 hakkın tamamlandı" : "🏁 Today's 4 attempts are complete",
      noBonus: tr ? "Bonus ödülü için en az 3 oyun kazanmalısın." : "Win at least 3 games to earn the bonus.",
      bonusLabel: tr ? "günlük bonus puan" : "daily bonus points",
    },
    games: {
      eyebrow: tr ? "FOOTBATTLE OYUNLARI" : "FOOTBATTLE GAMES",
      title: tr ? "Arenadaki oyununu seç" : "Choose your arena game",
      text: tr
        ? "Hazır oyunlara hemen gir. Düello destekleyenlerde arkadaşına link gönderip kapış. Geliştirme aşamasındaki oyunları da burada takip et."
        : "Jump straight into ready games. In duel-enabled modes, send a link to a friend and battle. Track upcoming modes here too.",
      playable: tr ? "oynanabilir" : "playable",
      soon: tr ? "yakında" : "coming soon",
      play: tr ? "Oyna" : "Play",
      duel: tr ? "Düello" : "Duel",
      view: tr ? "Oyunları Gör" : "View Games",
      solo: tr ? "Tek Oyuncu" : "Solo",
      both: tr ? "Tek Oyuncu + Düello" : "Solo + Duel",
    },
    hero: {
      line1: tr ? "Futbol bilgini" : "Ready to prove",
      line2: tr ? "kanıtlamaya hazır" : "your football",
      line3: tr ? "mısın?" : "knowledge?",
      text: tr
        ? "Tek başına skor kovala, arkadaşına meydan oku veya yeni oyunları keşfet. FootBattle'da bahane yok, futbol bilgisi konuşur."
        : "Chase scores solo, challenge a friend or discover new games. No excuses in FootBattle — football knowledge does the talking.",
      played: tr ? "Oynanan oyun" : "Games played",
      points: tr ? "Toplam puan" : "Total points",
      streak: tr ? "Günlük seri" : "Daily streak",
    },
    builders: {
      eyebrow: tr ? "KADRO ARAÇLARI" : "SQUAD TOOLS",
      title: tr ? "Sahaya sen karar ver" : "You decide who takes the pitch",
      text: tr
        ? "İster profesyonel takım kadronu oluştur, ister halısaha ekibini sahaya diz. Hazırladığın kadroyu arkadaşlarınla paylaş."
        : "Build a professional squad or line up your pickup team, then share your selection with friends.",
    },
    future: {
      eyebrow: tr ? "ARENA BÜYÜYOR" : "THE ARENA IS GROWING",
      title: tr ? "Yeni oyunlar sırada" : "More games are coming",
      text: tr
        ? "Tic Tac Toe düello modu ve yeni rekabetçi oyun modları, mevcut challenge altyapısına ekleyeceğimiz sonraki özellikler."
        : "Tic Tac Toe duel mode and more competitive modes are the next additions to the challenge system.",
    },
    friends: {
      eyebrow: tr ? "SOSYAL" : "SOCIAL",
      title: tr ? "Arkadaşlar" : "Friends",
      friend: tr ? "arkadaş" : "friends",
      online: tr ? "çevrimiçi" : "online",
      loading: tr ? "Arkadaşların yükleniyor..." : "Loading friends...",
      empty: tr ? "Henüz arkadaşın yok" : "No friends yet",
      emptyText: tr ? "Oyuncuları bulup arkadaş listene ekleyebilirsin." : "Find players and add them to your friends list.",
      all: tr ? "Tüm arkadaşlar" : "All friends",
      challenge: tr ? "Meydan Oku" : "Challenge",
    },
    footer: tr ? "Futbol oyunları arenası" : "Football games arena",
  };
}

function getGames(locale: Locale): GameItem[] {
  const tr = locale === "tr";
  return [
    {
      code: "wordle",
      title: "Wordle",
      description: tr ? "Futbolcunun soyadını 5 tahminde bul." : "Guess the footballer's surname in 5 tries.",
      heroDescription: tr ? "5 tahminde futbolcunun soyadını bul ve günlük serini koru." : "Find the surname in 5 guesses and keep your daily streak alive.",
      icon: "🟩",
      mode: "solo",
      ready: true,
      playHref: localeHref(locale, "/wordle", true),
    },
    {
      code: "guess_the_player",
      title: tr ? "Guess the Player" : "Guess the Player",
      description: tr ? "İpuçlarını karşılaştır ve gizli futbolcuyu tahmin et." : "Compare clues and guess the hidden footballer.",
      heroDescription: tr ? "İpuçlarını takip et, gizli futbolcuyu mümkün olduğunca az tahminde bul." : "Use the clues to find the hidden footballer in as few guesses as possible.",
      icon: "🕵️",
      mode: "solo",
      ready: true,
      playHref: localeHref(locale, "/guess-the-player", true),
    },
    {
      code: "player_quiz",
      title: "Player Quiz",
      description: tr ? "Doğum yılı, milliyet ve kariyer kulüplerini tamamla. Tek başına oyna veya arkadaşına meydan oku." : "Complete the birth year, nationality and career clubs. Play solo or challenge a friend.",
      heroDescription: tr ? "Futbolcunun doğum yılını, milliyetini ve kariyer kulüplerini tamamla." : "Complete the player's birth year, nationality and career clubs.",
      icon: "🧠",
      mode: "both",
      ready: true,
      playHref: "/player-quiz",
      duelHref: "/duels/challenge?game=player_quiz",
    },
    {
      code: "transfer_quiz",
      title: "Transfer Quiz",
      description: tr ? "Transfer gündemindeki yıldızın doğum yılını, milliyetini ve kariyer kulüplerini tamamla." : "Complete the birth year, nationality and career clubs of the transfer-market star.",
      heroDescription: tr ? "Gündemdeki transfer oyuncusunu ne kadar tanıyorsun? Doğum yılı, milliyet ve kulüp geçmişini çöz." : "How well do you know the player in the transfer spotlight? Solve the birth year, nationality and club history.",
      icon: "🔥",
      mode: "solo",
      ready: true,
      playHref: "/transfer-quiz",
    },
    {
      code: "tic_tac_toe",
      title: tr ? "Futbol Tic Tac Toe" : "Football Tic Tac Toe",
      description: tr ? "Takım ve milliyet kesişimlerine uygun futbolcuları bul. 120 saniyede 3x3 grid'i tamamla." : "Find players matching club and nationality intersections. Complete the 3x3 grid in 120 seconds.",
      heroDescription: tr ? "Takım ve milliyet kesişimlerini doldur, 3x3 futbol grid'inde skorunu yükselt." : "Fill club and nationality intersections and raise your score on the 3x3 football grid.",
      icon: "⭕",
      mode: "solo",
      ready: true,
      playHref: localeHref(locale, "/tic-tac-toe", true),
    },
    {
      code: "club_clash",
      title: tr ? "2 Takım 1 Oyuncu" : "2 Clubs 1 Player",
      description: tr ? "İki takımda da forma giymiş futbolcuyu bul. 120 saniyede skor kovala veya arkadaşına meydan oku." : "Find players who represented both clubs. Chase a score in 120 seconds or challenge a friend.",
      heroDescription: tr ? "İki takımda da oynamış futbolcuları 120 saniyede bul. Her doğru +20 puan, 3 pas hakkın var." : "Find players who represented both clubs in 120 seconds. Each correct answer is +20 points and you have 3 passes.",
      icon: "⚔️",
      mode: "both",
      ready: true,
      playHref: "/club-clash",
      duelHref: "/duels/challenge?game=club_clash",
    },
    {
      code: "club_nation",
      title: tr ? "1 Takım 1 Millet" : "1 Club 1 Nation",
      description: tr ? "Verilen takım ve millet kombinasyonuna uygun futbolcuyu 120 saniye içinde bul. Her doğru +20 puan." : "Find players matching the club and nationality combination within 120 seconds. Each correct answer is +20 points.",
      heroDescription: tr ? "120 saniyede takım ve millet kesişimine uyan mümkün olduğunca çok futbolcuyu bul." : "Find as many players as possible matching the club and nationality intersection in 120 seconds.",
      icon: "🌍",
      mode: "both",
      ready: true,
      playHref: "/club-nation",
      duelHref: "/duels/challenge?game=club_nation",
    },
    {
      code: "career_path",
      title: tr ? "Career Path" : "Career Path",
      description: tr ? "Oyuncunun kariyerinde forma giydiği kulüpleri doğru şekilde tamamla." : "Complete the clubs from the player's career in the correct order.",
      heroDescription: tr ? "Oyuncunun kariyer yolunu çöz ve forma giydiği kulüpleri bul." : "Solve the player's career path and identify the clubs they played for.",
      icon: "🛣️",
      mode: "solo",
      ready: true,
      playHref: localeHref(locale, "/career-path", true),
    },
  ];
}

function getBuilders(locale: Locale) {
  const tr = locale === "tr";
  return [
    {
      title: tr ? "Takım Kadro Oluşturucu" : "Team Squad Builder",
      description: tr ? "Takımını seç, ilk 11'i düzenle, transferlerini ekle ve kadronu paylaş." : "Choose your club, arrange the starting XI, add transfers and share your squad.",
      href: "/takim-kadro",
      button: tr ? "Kadronu Kur" : "Build Squad",
      icon: "⚽",
    },
    {
      title: tr ? "Halısaha Kadro Oluşturucu" : "Pickup Squad Builder",
      description: tr ? "Arkadaşlarını sahaya diz, halısaha kadronu oluştur ve tek linkle paylaş." : "Place your friends on the pitch, build your pickup squad and share it with one link.",
      href: "/halisaha-kadro",
      button: tr ? "Halısaha Kadrosu Kur" : "Build Pickup Squad",
      icon: "👟",
    },
  ];
}

function getFriendInitials(friend: FriendUser) {
  const value = friend.displayName || friend.username || "FB";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "FB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function modeLabel(game: GameItem, c: Copy) {
  if (game.mode === "both") return c.games.both;
  if (game.mode === "duel") return c.games.duel;
  return c.games.solo;
}

export default function UnifiedHomePage({ locale }: { locale: Locale }) {
  const c = useMemo(() => getCopy(locale), [locale]);
  const games = useMemo(() => getGames(locale), [locale]);
  const builders = useMemo(() => getBuilders(locale), [locale]);
  const heroGames = useMemo(() => games.filter((game) => game.ready), [games]);

  const [user, setUser] = useState<HomeUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeHeroGameIndex, setActiveHeroGameIndex] = useState(0);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [onlineFriendCount, setOnlineFriendCount] = useState(0);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeResponse | null>(null);
  const [dailyChallengeLoading, setDailyChallengeLoading] = useState(false);

  const activeHeroGame = heroGames[activeHeroGameIndex] ?? heroGames[0];

  useEffect(() => {
    if (heroGames.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setActiveHeroGameIndex((current) => (current + 1) % heroGames.length);
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [heroGames.length]);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setUser(null);
          setProfile(null);
          return;
        }
        setUser({ id: authUser.id, email: authUser.email });
        const { data } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url,total_score,current_streak,best_streak,games_played,games_won")
          .eq("id", authUser.id)
          .maybeSingle();
        if (data) setProfile(data as Profile);
      } catch {
        setUser(null);
        setProfile(null);
      } finally {
        setLoadingUser(false);
      }
    }
    void loadUser();
  }, []);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setFriendCount(0);
      setOnlineFriendCount(0);
      return;
    }
    let cancelled = false;
    async function loadFriends() {
      try {
        setFriendsLoading(true);
        const response = await fetch("/api/friends", { cache: "no-store" });
        const result = (await response.json()) as FriendsResponse;
        if (cancelled || !response.ok || !result.ok) return;
        const ordered = [...(result.friends ?? [])].sort((a, b) => {
          if (a.user.online === b.user.online) return a.user.displayName.localeCompare(b.user.displayName, locale);
          return a.user.online ? -1 : 1;
        });
        setFriends(ordered);
        setFriendCount(result.summary?.friendCount ?? ordered.length);
        setOnlineFriendCount(result.summary?.onlineFriendCount ?? ordered.filter((item) => item.user.online).length);
      } catch {
        // Homepage remains usable if social data fails.
      } finally {
        if (!cancelled) setFriendsLoading(false);
      }
    }
    void loadFriends();
    const intervalId = window.setInterval(() => void loadFriends(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [locale, user]);

  useEffect(() => {
    if (!user) {
      setDailyChallenge(null);
      setDailyChallengeLoading(false);
      return;
    }
    let cancelled = false;
    async function loadDailyChallenge() {
      try {
        setDailyChallengeLoading(true);
        const response = await fetch("/api/daily-challenge", { cache: "no-store" });
        const result = (await response.json()) as DailyChallengeResponse;
        if (cancelled) return;
        setDailyChallenge(response.ok && result.ok ? result : null);
      } catch {
        if (!cancelled) setDailyChallenge(null);
      } finally {
        if (!cancelled) setDailyChallengeLoading(false);
      }
    }
    void loadDailyChallenge();
    const handleFocus = () => void loadDailyChallenge();
    window.addEventListener("focus", handleFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = locale === "tr" ? "/tr" : "/en";
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!activeHeroGame) return null;

  return (
    <main className="min-h-screen bg-[#07111f] pb-20 text-white sm:pb-24">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 shadow-lg shadow-black/10 backdrop-blur-xl">
        <div className="mx-auto flex h-[82px] max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
          <Link href={`/${locale}`} aria-label="FootBattle" className="flex min-w-0 items-center">
            <Image src="/footbattle-logo.png" alt="FootBattle" width={360} height={110} priority sizes="(max-width: 640px) 150px, 230px" className="h-auto w-[150px] object-contain sm:w-[210px] lg:w-[230px]" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-400 xl:flex">
            <button type="button" onClick={() => scrollToSection("anasayfa")} className="text-green-400 transition hover:text-green-300">{c.nav.home}</button>
            <button type="button" onClick={() => scrollToSection("oyunlar")} className="transition hover:text-white">{c.nav.games}</button>
            <Link href="/takim-kadro" className="transition hover:text-white">{c.nav.squad}</Link>
            <Link href="/halisaha-kadro" className="transition hover:text-white">{c.nav.pickup}</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.035] p-1 text-xs font-black">
              <Link href="/tr" className={`rounded-lg px-2.5 py-2 transition ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400 hover:text-white"}`}>TR</Link>
              <Link href="/en" className={`rounded-lg px-2.5 py-2 transition ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400 hover:text-white"}`}>EN</Link>
            </div>

            {!loadingUser && user && profile ? (
              <>
                <Link href={localeHref(locale, "/profile", true)} className="hidden rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-2.5 text-sm font-black text-green-400 transition hover:bg-green-500/15 sm:inline-flex">
                  {profile.display_name || profile.username || c.nav.profile}
                </Link>
                <button type="button" onClick={handleLogout} className="hidden rounded-xl border border-white/10 px-3 py-2.5 text-sm font-black text-slate-300 transition hover:border-white/20 hover:text-white sm:inline-flex">{c.nav.logout}</button>
              </>
            ) : !loadingUser ? (
              <Link href="/login" className="hidden rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400 sm:inline-flex">{c.nav.login}</Link>
            ) : null}
          </div>
        </div>
      </header>

      <section className="border-b border-white/5 bg-[#081523]">
        <div className="mx-auto max-w-[1240px] px-5 py-8 lg:px-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">{c.daily.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">{c.daily.title}</h2>
            <p className="mt-2 max-w-[760px] text-sm leading-6 text-slate-400">{c.daily.text}</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
            <DailyChallengeCard locale={locale} c={c} user={user} loading={dailyChallengeLoading} data={dailyChallenge} />
            <div id="liderlik" className="scroll-mt-24"><LeaderboardCard locale={locale} /></div>
          </div>
        </div>
      </section>

      <section id="oyunlar" className="scroll-mt-24 border-t border-white/5 bg-[#081523]">
        <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-400">{c.games.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">{c.games.title}</h2>
              <p className="mt-3 max-w-[760px] text-sm leading-6 text-slate-400 sm:text-base">{c.games.text}</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-black">
              <span className="flex items-center gap-2 text-green-400"><span className="h-2 w-2 rounded-full bg-green-400" />{games.filter((game) => game.ready).length} {c.games.playable}</span>
              <span className="flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full bg-slate-600" />{games.filter((game) => !game.ready).length} {c.games.soon}</span>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => <GameCard key={game.code} game={game} c={c} />)}
          </div>
        </div>
      </section>

      <section id="anasayfa" className="scroll-mt-24">
        <div className={`mx-auto px-5 pb-12 pt-6 lg:px-6 ${user ? "grid max-w-[1240px] gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(350px,0.72fr)]" : "max-w-[1180px]"}`}>
          <div className={`flex flex-col justify-center pt-7 ${user ? "" : "min-h-[480px] w-full"}`}>
            <div className={user ? "max-w-[720px]" : "w-full"}>
              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-black text-green-400">
                <span>{activeHeroGame.icon}</span><span>{modeLabel(activeHeroGame, c)}</span><span className="opacity-40">•</span><span>{activeHeroGame.title}</span>
              </div>
              <h1 className={`mt-7 font-black leading-[1.03] tracking-tight ${user ? "max-w-[690px] text-5xl lg:text-[64px]" : "max-w-[900px] text-5xl sm:text-6xl lg:text-[74px]"}`}>
                {c.hero.line1}<span className="mt-2 block text-green-400">{c.hero.line2}</span><span className="block text-green-400">{c.hero.line3}</span>
              </h1>
              <p className={`mt-6 leading-8 text-slate-400 ${user ? "max-w-[620px] text-base" : "max-w-[850px] text-lg"}`}>{c.hero.text}</p>

              <div className={`mt-7 rounded-2xl border border-green-500/15 bg-green-500/[0.035] px-5 py-4 ${user ? "max-w-[650px]" : "max-w-[900px]"}`}>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-2xl">{activeHeroGame.icon}</div>
                  <div className="min-w-0"><p className="font-black">{activeHeroGame.title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{activeHeroGame.heroDescription}</p></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {heroGames.map((game, index) => {
                    const active = index === activeHeroGameIndex;
                    return <button key={game.code} type="button" title={game.title} onClick={() => setActiveHeroGameIndex(index)} className={`h-2 rounded-full transition-all ${active ? "w-9 bg-green-400" : "w-4 bg-white/10 hover:bg-white/20"}`} />;
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {activeHeroGame.playHref && <Link href={activeHeroGame.playHref} className="rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-[#07111f] transition hover:-translate-y-0.5 hover:bg-green-400">{activeHeroGame.icon} {activeHeroGame.title} {c.games.play}</Link>}
                {activeHeroGame.duelHref && <Link href={activeHeroGame.duelHref} className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-3.5 text-sm font-black text-purple-300 transition hover:-translate-y-0.5 hover:bg-purple-500/20">⚔️ {c.games.duel}</Link>}
                <button type="button" onClick={() => scrollToSection("oyunlar")} className="rounded-xl border border-white/15 px-6 py-3.5 text-sm font-black text-slate-200 transition hover:border-white/30 hover:bg-white/[0.04]">{c.games.view}</button>
              </div>

              {profile && (
                <div className="mt-8 grid max-w-[560px] grid-cols-3 gap-3">
                  <HeroStat locale={locale} value={profile.games_played} label={c.hero.played} />
                  <HeroStat locale={locale} value={profile.total_score} label={c.hero.points} />
                  <HeroStat locale={locale} value={`🔥 ${profile.current_streak}`} label={c.hero.streak} />
                </div>
              )}
            </div>
          </div>

          {user && <div className="self-start pt-3"><HomeFriendsCard locale={locale} c={c} friends={friends} friendCount={friendCount} onlineFriendCount={onlineFriendCount} loading={friendsLoading} /></div>}
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">{c.builders.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-black">{c.builders.title}</h2>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-slate-400">{c.builders.text}</p>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">{builders.map((builder) => <BuilderCard key={builder.href} {...builder} />)}</div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-[#081523]">
        <div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-6">
          <div className="rounded-3xl border border-purple-500/15 bg-purple-500/[0.04] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">{c.future.eyebrow}</p><h2 className="mt-2 text-2xl font-black">{c.future.title}</h2><p className="mt-2 max-w-[700px] text-sm leading-6 text-slate-400">{c.future.text}</p></div>
              <span className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-300">⭕ Tic Tac Toe {c.games.duel}</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-7 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-6"><p>© 2026 FootBattle</p><span>{c.footer}</span></div>
      </footer>
    </main>
  );
}

function DailyChallengeCard({ locale, c, user, loading, data }: { locale: Locale; c: Copy; user: HomeUser | null; loading: boolean; data: DailyChallengeResponse | null }) {
  const [shareMessage, setShareMessage] = useState("");
  const progress = data?.progress ?? { guessThePlayer: false, playerQuiz: false, ticTacToe: false, wordle: false };
  const attempted = data?.attempted ?? { guessThePlayer: false, playerQuiz: false, ticTacToe: false, wordle: false };
  const tr = locale === "tr";
  const games = [
    { code: "guess_the_player", label: "Guess The Player", href: localeHref(locale, "/guess-the-player", true), icon: "🕵️", completed: progress.guessThePlayer, attempted: attempted.guessThePlayer },
    { code: "player_quiz", label: "Player Quiz", href: "/player-quiz", icon: "🧠", completed: progress.playerQuiz, attempted: attempted.playerQuiz },
    { code: "tic_tac_toe", label: "Tic Tac Toe", href: localeHref(locale, "/tic-tac-toe", true), icon: "⭕", completed: progress.ticTacToe, attempted: attempted.ticTacToe },
    { code: "wordle", label: "Wordle", href: localeHref(locale, "/wordle", true), icon: "🟩", completed: progress.wordle, attempted: attempted.wordle },
  ];
  const completedCount = data?.completedCount ?? games.filter((game) => game.completed).length;
  const attemptedCount = games.filter((game) => game.attempted).length;
  const required = data?.required ?? 3;
  const totalGames = data?.totalGames ?? 4;
  const progressPercent = Math.min(100, Math.round((attemptedCount / Math.max(1, totalGames)) * 100));
  const nextGame = data?.nextGame ?? games.find((game) => !game.attempted) ?? null;
  const allAttempted = attemptedCount >= totalGames;
  const rewardPoints = completedCount >= 4 ? 350 : completedCount >= required ? 250 : 0;

  async function shareDailyResult() {
    const resultLines = games.map((game) => `${game.completed ? "✅" : "❌"} ${game.label}`).join("\n");
    const text = tr
      ? `Bugünün FootBattle'ı: ${completedCount}/${totalGames} ⚽\n\n${resultLines}\n\n${rewardPoints > 0 ? `🏆 Günlük ödül: +${rewardPoints} puan` : "Bugün bonus puanı kaçırdım 😅"}\n\nSen kaçta kaç yaptın?`
      : `Today's FootBattle: ${completedCount}/${totalGames} ⚽\n\n${resultLines}\n\n${rewardPoints > 0 ? `🏆 Daily reward: +${rewardPoints} points` : "I missed the bonus today 😅"}\n\nHow many did you get?`;
    try {
      if (navigator.share) {
        await navigator.share({ title: tr ? "FootBattle Günlük Sonuç" : "FootBattle Daily Result", text });
        setShareMessage(tr ? "Paylaşım açıldı ✓" : "Share sheet opened ✓");
      } else {
        await navigator.clipboard.writeText(text);
        setShareMessage(tr ? "Sonuç panoya kopyalandı ✓" : "Result copied ✓");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        setShareMessage(tr ? "Sonuç panoya kopyalandı ✓" : "Result copied ✓");
      } catch {
        setShareMessage(tr ? "Sonuç paylaşılamadı." : "Could not share the result.");
      }
    }
  }

  if (!user) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.045] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">{c.daily.cardEyebrow}</p>
          <h3 className="mt-2 text-2xl font-black">{c.daily.cardTitle}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{c.daily.cardText}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {games.map((game) => <div key={game.code} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3"><span className="text-xl">{game.icon}</span><span className="text-sm font-black">{game.label}</span></div>)}
          </div>
          <Link href="/login" className="mt-5 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-[#07111f] transition hover:bg-yellow-300">{c.daily.start} →</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.045] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">{c.daily.cardEyebrow}</p>
            <h3 className="mt-2 text-2xl font-black">{tr ? "Günlük Görev" : "Daily Mission"}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {allAttempted
                ? completedCount >= 4
                  ? tr ? "Muhteşem. Dört oyunun dördünü de kazandın. 🏆" : "Perfect. You won all four games. 🏆"
                  : completedCount >= required
                    ? tr ? `${completedCount}/${totalGames} başarılı. Günlük ödülü kaptın. 🔥` : `${completedCount}/${totalGames} wins. You earned the daily reward. 🔥`
                    : tr ? `${completedCount}/${totalGames} başarılı. Bugün bonus puanı kaçtı; yarın rövanş var.` : `${completedCount}/${totalGames} wins. No bonus today — run it back tomorrow.`
                : completedCount >= required
                  ? tr ? "Ana ödülü aldın. Kalan oyunları da kazanırsan 4/4 ödülünü kaparsın." : "Main reward secured. Win the remaining games for the 4/4 bonus."
                  : tr ? `${required}/${totalGames} kazan → +250 puan` : `Win ${required}/${totalGames} → +250 points`}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-yellow-400/20 bg-black/20 px-4 py-3 text-center"><p className="text-2xl font-black text-yellow-300">{completedCount}<span className="text-slate-600">/{totalGames}</span></p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{c.daily.success}</p></div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-600"><span>{attemptedCount}/{totalGames} {c.daily.gamesPlayed}</span><span>{completedCount} {c.daily.wins}</span></div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {games.map((game) => {
            const failed = game.attempted && !game.completed;
            const cardClass = game.completed ? "border-green-500/25 bg-green-500/[0.09]" : failed ? "border-red-500/25 bg-red-500/[0.08]" : "border-white/10 bg-black/15 hover:border-yellow-400/30 hover:bg-yellow-400/[0.04]";
            const content = <><div className="flex min-w-0 items-center gap-3"><span className="text-xl">{game.icon}</span><div className="min-w-0"><span className="block truncate text-sm font-black">{game.label}</span>{game.completed && <span className="mt-0.5 block text-[10px] font-bold text-green-400/70">{c.daily.won}</span>}{failed && <span className="mt-0.5 block text-[10px] font-bold text-red-400/70">{c.daily.used}</span>}</div></div><span className={`text-base font-black ${game.completed ? "text-green-400" : failed ? "text-red-400" : "text-slate-600"}`}>{game.completed ? "✓" : failed ? "✕" : "○"}</span></>;
            if (game.attempted) return <div key={game.code} className={`flex cursor-default items-center justify-between gap-3 rounded-xl border px-4 py-3 ${cardClass}`}>{content}</div>;
            return <Link key={game.code} href={`${game.href}?daily=1`} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${cardClass}`}>{content}</Link>;
          })}
        </div>

        {allAttempted && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{c.daily.result}</p><p className="mt-1 text-xl font-black">{completedCount}/{totalGames} {tr ? "başarılı" : "wins"}</p><p className={`mt-1 text-xs font-bold ${rewardPoints > 0 ? "text-green-300" : "text-slate-500"}`}>{rewardPoints > 0 ? `🏆 +${rewardPoints} ${c.daily.bonusLabel}` : c.daily.noBonus}</p></div>
              <button type="button" onClick={() => void shareDailyResult()} className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-[#07111f] transition hover:bg-yellow-300">{c.daily.share}</button>
            </div>
            {shareMessage && <p className="mt-3 text-xs font-bold text-green-300">{shareMessage}</p>}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-green-300">3/4 → +250</span><span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-yellow-300">4/4 → +350</span></div>
          {loading ? <span className="text-sm font-black text-slate-500">{c.daily.loading}</span> : allAttempted ? <span className={`rounded-xl border px-4 py-2.5 text-sm font-black ${completedCount >= required ? "border-green-500/20 bg-green-500/10 text-green-300" : "border-slate-500/20 bg-white/[0.03] text-slate-400"}`}>{completedCount >= required ? c.daily.ready : c.daily.done}</span> : nextGame ? <Link href={`${nextGame.href}?daily=1`} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-yellow-300">{attemptedCount === 0 ? c.daily.begin : c.daily.continue} → {nextGame.label}</Link> : null}
        </div>
      </div>
    </section>
  );
}

function HeroStat({ locale, value, label }: { locale: Locale; value: number | string; label: string }) {
  return <div className="rounded-xl border border-white/5 bg-white/[0.04] p-3"><p className="text-lg font-black text-green-400">{typeof value === "number" ? new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(value) : value}</p><p className="mt-1 text-[11px] text-slate-500">{label}</p></div>;
}

function GameCard({ game, c }: { game: GameItem; c: Copy }) {
  const duelOnly = game.mode === "duel";
  const both = game.mode === "both";
  if (!game.ready) {
    return <article className="relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 opacity-70"><div className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{c.games.soon}</div><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-2xl">{game.icon}</div><p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{modeLabel(game, c)}</p><h3 className="mt-2 text-xl font-black text-slate-300">{game.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{game.description}</p></article>;
  }
  return (
    <article className={`group flex min-h-[260px] flex-col rounded-2xl border p-5 transition hover:-translate-y-1 ${duelOnly ? "border-purple-500/25 bg-purple-500/[0.055] hover:border-purple-400/40" : both ? "border-green-500/15 bg-white/[0.035] hover:border-purple-400/30" : "border-white/10 bg-white/[0.035] hover:border-green-400/25"}`}>
      <div className="flex items-start justify-between gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-2xl">{game.icon}</div><div className="flex flex-col items-end gap-2"><span className="rounded-full border border-green-500/15 bg-green-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-green-400">{c.games.playable}</span><span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider ${duelOnly || both ? "bg-purple-500/10 text-purple-300" : "bg-white/[0.04] text-slate-500"}`}>{modeLabel(game, c)}</span></div></div>
      <h3 className="mt-5 text-xl font-black">{game.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{game.description}</p>
      <div className="mt-6 flex flex-wrap gap-2">{game.playHref && <Link href={game.playHref} className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400">{c.games.play} →</Link>}{game.duelHref && <Link href={game.duelHref} className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-sm font-black text-purple-300 transition hover:bg-purple-500/20">⚔️ {c.games.duel}</Link>}</div>
    </article>
  );
}

function BuilderCard({ title, description, href, button, icon }: { title: string; description: string; href: string; button: string; icon: string }) {
  return <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-xl">{icon}</div><div className="min-w-0 flex-1"><h3 className="text-xl font-black">{title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p><Link href={href} className="mt-5 inline-flex rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-yellow-300">{button}</Link></div></div></article>;
}

function HomeFriendsCard({ locale, c, friends, friendCount, onlineFriendCount, loading }: { locale: Locale; c: Copy; friends: FriendItem[]; friendCount: number; onlineFriendCount: number; loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-green-500/20 bg-white/[0.035]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">{c.friends.eyebrow}</p><h2 className="mt-1 text-xl font-black">{c.friends.title}</h2></div><div className="text-right text-xs font-black"><p className="text-slate-500">{friendCount} {c.friends.friend}</p><p className="mt-1 text-green-400">{onlineFriendCount} {c.friends.online}</p></div></div>
      <div className="p-4">{loading && friends.length === 0 ? <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-6 text-center text-sm text-slate-500">{c.friends.loading}</div> : friends.length === 0 ? <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-6 text-center"><p className="text-sm font-black">{c.friends.empty}</p><p className="mt-1 text-xs text-slate-500">{c.friends.emptyText}</p></div> : <div className="space-y-2">{friends.slice(0, 4).map((item) => <FriendRow key={item.friendshipId} c={c} friend={item.user} />)}</div>}</div>
      <div className="flex items-center justify-between border-t border-white/10 px-5 py-4"><Link href={localeHref(locale, "/friends", true)} className="text-xs font-black text-slate-400 transition hover:text-white">{c.friends.all}</Link><Link href="/duels/challenge?game=club_clash" className="text-xs font-black text-purple-300 transition hover:text-purple-200">⚔️ {c.friends.challenge} →</Link></div>
    </section>
  );
}

function FriendRow({ c, friend }: { c: Copy; friend: FriendUser }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-3"><div className="relative">{friend.avatarUrl ? <img src={friend.avatarUrl} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500 font-black text-[#07111f]">{getFriendInitials(friend)}</div>}<span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0b1726] ${friend.online ? "bg-green-400" : "bg-slate-600"}`} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{friend.displayName}</p><div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px]">{friend.username && <span className="truncate font-black text-green-400">@{friend.username}</span>}<span className="truncate text-slate-600">{friend.lastSeenText}</span></div></div><Link href="/duels/challenge?game=club_clash" className="shrink-0 rounded-lg border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-[11px] font-black text-purple-300 transition hover:border-purple-400/40 hover:bg-purple-500/20">⚔️<span className="ml-1 hidden sm:inline">{c.friends.challenge}</span></Link></div>;
}
