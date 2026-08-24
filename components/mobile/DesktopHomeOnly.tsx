"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import UnifiedHomePage from "@/components/UnifiedHomePage";
import type { Locale } from "@/lib/i18n/config";

export default function DesktopHomeOnly({ locale }: { locale: Locale }) {
  // Keep SSR/desktop content intact, then unmount the heavy desktop home on mobile.
  // This stops its hidden friends/daily polling while MobileHomeDashboard is visible.
  const [showDesktopHome, setShowDesktopHome] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setShowDesktopHome(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (!showDesktopHome) return null;

  const tr = locale === "tr";

  return (
    <>
      <section className="border-b border-white/10 bg-[#081523]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-4 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {tr ? "Hızlı Erişim" : "Quick Access"}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-300">
              {tr ? "Rekabet modlarına direkt gir." : "Jump straight into competitive modes."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`/${locale}/rank`}
              className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f] transition hover:-translate-y-0.5 hover:bg-green-400"
            >
              🏆 Ranked
            </Link>
            <Link
              href={`/${locale}/duels`}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 text-sm font-black text-purple-300 transition hover:-translate-y-0.5 hover:bg-purple-500/20"
            >
              ⚔️ {tr ? "Düello" : "Duels"}
            </Link>
          </div>
        </div>
      </section>
      <UnifiedHomePage locale={locale} />
    </>
  );
}
