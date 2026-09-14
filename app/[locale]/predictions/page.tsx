import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import PredictionHistory from "@/components/football/PredictionHistory";
import BackButton from "@/components/navigation/BackButton";
import { isLocale, type Locale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center gap-3">
          <BackButton fallbackHref={`/${locale}`} ariaLabel={tr ? "Geri" : "Back"} />
          <Image
            src="/footbattle-logo.png"
            alt="FootBattle"
            width={180}
            height={48}
            priority
            className="h-8 w-auto object-contain"
          />
        </div>
        <h1 className="mt-5 text-3xl font-black sm:text-4xl">{tr ? "Tahminlerim" : "My Predictions"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          {tr ? "Yaptığın skor tahminlerini, gerçek sonuçları ve kazandığın XP'yi burada görebilirsin." : "See your score predictions, final results and earned XP here."}
        </p>
        <div className="mt-7">
          <PredictionHistory locale={locale as Locale} />
        </div>
      </div>
    </main>
  );
}
