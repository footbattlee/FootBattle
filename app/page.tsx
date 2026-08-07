"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import LeaderboardCard from "../components/LeaderboardCard";
import { createClient } from "../lib/supabase/client";

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

type HomeUser = {
  id: string;
  email?: string;
};

const games = [
  {
    title: "Wordle",
    description:
      "Günün futbolcusunun soyadını 5 tahminde bul.",
    href: "/wordle",
    tag: "GÜNLÜK",
  },
  {
    title: "Guess the Player",
    description:
      "İpuçlarını takip et, gizli futbolcuyu tahmin et.",
    href: "/guess-the-player",
    tag: "GÜNLÜK",
  },
  {
    title: "Player Quiz",
    description:
      "Kulüp, kupa, ülke ve doğum yılı bilgilerini bul.",
    href: "/player-quiz",
    tag: "GÜNLÜK",
  },
  {
    title: "Career Path",
    description:
      "Oyuncunun kariyerinde forma giydiği kulüpleri bul.",
    href: "/career-path",
    tag: "GÜNLÜK",
  },
];

const builders = [
  {
    title: "Takım Kadro Oluşturucu",
    description:
      "Takımını seç, ilk 11'i düzenle, transfer ekle ve paylaş.",
    href: "/takim-kadro",
    button: "Kadronu Kur",
    icon: "⚽",
  },
  {
    title: "Halısaha Kadro Oluşturucu",
    description:
      "Arkadaşlarını sahaya diz, kadronu oluştur ve paylaş.",
    href: "/halisaha-kadro",
    button: "Halısaha Kadrosu Kur",
    icon: "👟",
  },
];

export default function HomePage() {
  const [user, setUser] =
    useState<HomeUser | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loadingUser, setLoadingUser] =
    useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          setProfile(null);
          return;
        }

        setUser({
          id: authUser.id,
          email: authUser.email,
        });

        const { data: profileData } =
          await supabase
            .from("profiles")
            .select(`
              id,
              username,
              display_name,
              avatar_url,
              total_score,
              current_streak,
              best_streak,
              games_played,
              games_won
            `)
            .eq("id", authUser.id)
            .maybeSingle();

        if (profileData) {
          setProfile(
            profileData as Profile,
          );
        }
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, []);

  async function handleLogout() {
    const supabase =
      createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  function scrollToSection(
    id: string,
  ) {
    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl">

        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 lg:px-6">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500 text-base font-black text-[#07111f] shadow-lg shadow-green-500/20">
              FB
            </div>

            <div>
              <p className="text-lg font-black leading-none">
                FootBattle
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Futbol oyunları arenası
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-400 xl:flex">

            <button
              type="button"
              onClick={() =>
                scrollToSection("anasayfa")
              }
              className="text-green-400 transition hover:text-green-300"
            >
              Ana Sayfa
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection("oyunlar")
              }
              className="transition hover:text-white"
            >
              Oyunlar
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection("duellolar")
              }
              className="transition hover:text-white"
            >
              Düellolar
            </button>

            <Link
              href="/takim-kadro"
              className="transition hover:text-white"
            >
              Kadro Kur
            </Link>

            <Link
              href="/halisaha-kadro"
              className="transition hover:text-white"
            >
              Halısaha Kadro
            </Link>

            <button
              type="button"
              onClick={() =>
                scrollToSection("liderlik")
              }
              className="transition hover:text-white"
            >
              Liderlik
            </button>

          </nav>

          <div className="flex items-center gap-2">

            {!loadingUser &&
              user &&
              profile && (
                <>
                  <Link
                    href="/profile"
                    className="rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-2.5 text-sm font-black text-green-400 transition hover:bg-green-500/15"
                  >
                    {profile.display_name ||
                      profile.username ||
                      "Profil"}
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:border-white/20 hover:text-white"
                  >
                    Çıkış
                  </button>
                </>
              )}

            {!loadingUser &&
              !user && (
                <Link
                  href="/login"
                  className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400"
                >
                  Giriş Yap
                </Link>
              )}

          </div>

        </div>

      </header>

      {/* HERO */}

      <section
        id="anasayfa"
        className="scroll-mt-24"
      >
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 pb-12 pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.75fr)] lg:px-6">

          <div className="flex flex-col justify-center">

            <div className="inline-flex w-fit items-center rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-black text-green-400">
              Günün oyunu hazır
            </div>

            <h1 className="mt-6 max-w-[620px] text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-[54px]">

              Futbol bilgini

              <span className="mt-2 block text-green-400">
                kanıtlamaya hazır
              </span>

              <span className="block text-green-400">
                mısın?
              </span>

            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
              Hazırsan başlayalım...
              ama kaybedersen kol bozuk
              demek yok.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">

              <Link
                href="/wordle"
                className="rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-[#07111f] transition hover:-translate-y-0.5 hover:bg-green-400"
              >
                Günün Wordle&apos;ını Oyna
              </Link>

              <button
                type="button"
                onClick={() =>
                  scrollToSection("oyunlar")
                }
                className="rounded-xl border border-white/15 px-6 py-3.5 text-sm font-black text-slate-200 transition hover:border-white/30 hover:bg-white/[0.04]"
              >
                Oyunları Gör
              </button>

            </div>

            {profile && (
              <div className="mt-8 grid max-w-md grid-cols-3 gap-3">

                <HeroStat
                  value={
                    profile.games_played
                  }
                  label="Oynanan oyun"
                />

                <HeroStat
                  value={
                    profile.total_score
                  }
                  label="Toplam puan"
                />

                <HeroStat
                  value={`🔥 ${profile.current_streak}`}
                  label="Günlük seri"
                />

              </div>
            )}

          </div>

          <div
            id="liderlik"
            className="scroll-mt-24 self-start"
          >
            <LeaderboardCard />
          </div>

        </div>
      </section>

      {/* OYUNLAR */}

      <section
        id="oyunlar"
        className="scroll-mt-24 border-t border-white/5 bg-[#081523]"
      >
        <div className="mx-auto max-w-[1180px] px-5 py-14 lg:px-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-400">
                Oyunlar
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Her gün yeni mücadele
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Dört günlük oyunu
                tamamla, puanını topla
                ve leaderboard&apos;da
                yüksel.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                scrollToSection("liderlik")
              }
              className="w-fit rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:border-yellow-400/30 hover:text-yellow-300"
            >
              Liderliğe Git →
            </button>

          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {games.map(
              (game) => (
                <GameCard
                  key={game.href}
                  {...game}
                />
              ),
            )}

          </div>

        </div>
      </section>

      {/* KADRO ARAÇLARI */}

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-[1180px] px-5 py-14 lg:px-6">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">
              Kadro Araçları
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Sahaya sen karar ver
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              İster profesyonel takım
              kadrosunu düzenle, ister
              halısaha ekibini kur.
            </p>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2">

            {builders.map(
              (builder) => (
                <BuilderCard
                  key={builder.href}
                  {...builder}
                />
              ),
            )}

          </div>

        </div>
      </section>

      {/* DUELLOLAR */}

      <section
        id="duellolar"
        className="scroll-mt-24 border-t border-white/5 bg-[#081523]"
      >
        <div className="mx-auto max-w-[1180px] px-5 py-14 lg:px-6">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-7">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400">
                  Düellolar
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Arkadaşına meydan oku
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  İki kişilik oyunlar
                  burada yer alacak.
                  Rastgele futbolcu ve
                  takımlarla arkadaşına
                  karşı mücadele
                  edebileceksin.
                </p>

              </div>

              <div className="w-fit rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2.5 text-sm font-black text-yellow-300">
                Yakında
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* LIDERLIK CTA */}

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-[1180px] px-5 py-12 lg:px-6">

          <div className="flex flex-col gap-4 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.035] p-6 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
                Liderlik
              </p>

              <h2 className="mt-2 text-xl font-black">
                Zirvede kim var?
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Genel veya oyun bazlı
                sıralamayı incele.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                scrollToSection("liderlik")
              }
              className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-yellow-300"
            >
              Leaderboard&apos;u Gör
            </button>

          </div>

        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-5 py-7 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-6">

          <p>
            © 2026 FootBattle
          </p>

          <span>
            Futbol oyunları arenası
          </span>

        </div>
      </footer>

    </main>
  );
}

function HeroStat({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.04] p-3">

      <p className="text-lg font-black text-green-400">
        {typeof value === "number"
          ? new Intl.NumberFormat(
              "tr-TR",
            ).format(value)
          : value}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {label}
      </p>

    </div>
  );
}

function GameCard({
  title,
  description,
  href,
  tag,
}: {
  title: string;
  description: string;
  href: string;
  tag: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[200px] flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-green-400/25 hover:bg-white/[0.05]"
    >

      <div className="flex items-center justify-between gap-3">

        <span className="rounded-lg bg-green-500/10 px-2.5 py-1 text-[10px] font-black text-green-400">
          {tag}
        </span>

        <span className="text-base text-slate-700 transition group-hover:text-green-400">
          ↗
        </span>

      </div>

      <h3 className="mt-5 text-xl font-black">
        {title}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">
        {description}
      </p>

      <p className="mt-4 text-sm font-black text-green-400">
        Oyna →
      </p>

    </Link>
  );
}

function BuilderCard({
  title,
  description,
  href,
  button,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  button: string;
  icon: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6">

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">

          <h3 className="text-xl font-black">
            {title}
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            {description}
          </p>

          <Link
            href={href}
            className="mt-5 inline-flex rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-yellow-300"
          >
            {button}
          </Link>

        </div>

      </div>

    </article>
  );
}