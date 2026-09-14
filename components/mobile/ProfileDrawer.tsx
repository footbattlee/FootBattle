"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Locale = "tr" | "en";

type Props = {
  open: boolean;
  locale: Locale;
  onClose: () => void;
};

type Me = {
  rank: number | null;
  totalPlayers: number;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
  currentStreak: number;
};

const menu = (locale: Locale) => {
  const tr = locale === "tr";
  return [
    { icon: "👤", label: tr ? "Profil" : "Profile", href: `/${locale}/profile` },
    { icon: "🏆", label: tr ? "Sıralama" : "Leaderboard", href: `/${locale}/ranking` },
    { icon: "⚔️", label: "Ranked", href: `/${locale}/rank` },
    { icon: "🎖️", label: tr ? "Başarımlar" : "Achievements", href: "/achievements" },
    { icon: "🤝", label: tr ? "Düellolarım" : "My Duels", href: `/${locale}/duels` },
    { icon: "🏟️", label: tr ? "Turnuvalar" : "Competitions", href: `/${locale}/competitions` },
  ];
};

export default function ProfileDrawer({ open, locale, onClose }: Props) {
  const tr = locale === "tr";
  const [me, setMe] = useState<Me | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void fetch("/api/leaderboard/me?game=overall&period=all", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("profile-load-failed");
        return response.json();
      })
      .then((body) => {
        if (cancelled) return;
        setAuthenticated(Boolean(body?.authenticated));
        setMe(body?.me ?? null);
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const displayName = me?.displayName || me?.username || (tr ? "FootBattle Oyuncusu" : "FootBattle Player");
  const username = me?.username ? `@${me.username}` : null;

  return (
    <div className={`fixed inset-0 z-[140] md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button
        type="button"
        aria-label={tr ? "Menüyü kapat" : "Close menu"}
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        aria-label={tr ? "Profil menüsü" : "Profile menu"}
        className={`absolute inset-y-0 right-0 flex w-[84%] max-w-[360px] flex-col border-l border-white/10 bg-[#07111f] shadow-[-24px_0_60px_rgba(0,0,0,.45)] transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-[calc(env(safe-area-inset-top)+18px)]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-green-300">FootBattle</p>
            <h2 className="mt-1 text-xl font-black text-white">{tr ? "Hızlı Menü" : "Quick Menu"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-xl font-black text-slate-300 active:scale-95"
            aria-label={tr ? "Kapat" : "Close"}
          >
            ×
          </button>
        </div>

        <Link
          href={`/${locale}/profile`}
          onClick={onClose}
          className="mx-5 rounded-3xl border border-green-300/15 bg-gradient-to-br from-green-400/[.10] to-white/[.03] p-4 active:scale-[.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-green-300/20 bg-green-400/10 text-xl">
              {me?.avatarUrl ? (
                <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>⚽</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-white">{authenticated === false ? (tr ? "Profiline giriş yap" : "Sign in to your profile") : displayName}</p>
              {authenticated === false ? (
                <p className="mt-0.5 text-xs text-slate-400">{tr ? "Sıralama ve ilerlemeni görmek için giriş yap" : "Sign in to see your ranking and progress"}</p>
              ) : (
                <>
                  {username ? <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">{username}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black">
                    <span className="rounded-full border border-white/10 bg-white/[.05] px-2 py-1 text-slate-300">{tr ? "Seviye" : "Level"} {me?.level ?? 1}</span>
                    <span className="rounded-full border border-white/10 bg-white/[.05] px-2 py-1 text-slate-300">{me?.xp ?? 0} XP</span>
                    {me?.rank ? <span className="rounded-full border border-yellow-300/15 bg-yellow-300/[.07] px-2 py-1 text-yellow-200">#{me.rank}</span> : null}
                  </div>
                </>
              )}
            </div>
            <span className="text-lg text-slate-600">›</span>
          </div>
        </Link>

        <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-6">
          {menu(locale).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-slate-200 transition active:scale-[.98] active:bg-white/[.05]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.05] text-lg">{item.icon}</span>
              <span className="flex-1 text-[15px] font-black">{item.label}</span>
              <span className="text-lg text-slate-600">›</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-4">
          <p className="text-[10px] leading-4 text-slate-600">{tr ? "Profil simgesine tekrar dokunarak veya karanlık alana basarak kapatabilirsin." : "Tap the profile icon again or the backdrop to close."}</p>
        </div>
      </aside>
    </div>
  );
}
