"use client";

import Link from "next/link";
import { useEffect } from "react";

type Locale = "tr" | "en";

type Props = {
  open: boolean;
  locale: Locale;
  onClose: () => void;
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

        <div className="mx-5 rounded-3xl border border-green-300/15 bg-gradient-to-br from-green-400/[.10] to-white/[.03] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-300/20 bg-green-400/10 text-xl">⚽</div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-white">{tr ? "FootBattle Profilin" : "Your FootBattle Profile"}</p>
              <p className="mt-0.5 text-xs text-slate-400">{tr ? "Profil, sıralama ve ilerlemen tek yerde" : "Profile, ranking and progress in one place"}</p>
            </div>
          </div>
        </div>

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
