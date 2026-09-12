import type { Metadata } from "next";
import { notFound } from "next/navigation";

import FavoriteTeamPicker from "@/components/football/FavoriteTeamPicker";
import { isLocale, type Locale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function FavoriteTeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">⚽ FootBattle</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{tr ? "Favori Takımım" : "My Favorite Team"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          {tr
            ? "Takımını istediğin zaman değiştirebilirsin. Bu seçim ileride fikstür, maç tahmini ve içerik önerilerini kişiselleştirmek için kullanılacak."
            : "You can change your team at any time. We will use this choice to personalize fixtures, match predictions and content recommendations."}
        </p>
        <div className="mt-7">
          <FavoriteTeamPicker locale={locale as Locale} mode="page" />
        </div>
      </div>
    </main>
  );
}
