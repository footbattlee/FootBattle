import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

const ITEMS = [
  { slug: "super-lig", emoji: "🇹🇷", tr: "Süper Lig", en: "Turkish Süper Lig" },
  {
    slug: "premier-league",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Premier_League.svg",
    tr: "Premier League",
    en: "Premier League",
  },
  { slug: "la-liga", emoji: "🇪🇸", tr: "La Liga", en: "La Liga" },
  { slug: "serie-a", emoji: "🇮🇹", tr: "Serie A", en: "Serie A" },
  { slug: "bundesliga", emoji: "🇩🇪", tr: "Bundesliga", en: "Bundesliga" },
  { slug: "ligue-1", emoji: "🇫🇷", tr: "Ligue 1", en: "Ligue 1" },
  { slug: "primeira-liga", emoji: "🇵🇹", tr: "Primeira Liga", en: "Primeira Liga" },
  {
    slug: "champions-league",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Champions_League_logo_no_text.svg",
    tr: "UEFA Şampiyonlar Ligi",
    en: "UEFA Champions League",
  },
  {
    slug: "europa-league",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Europa_League_logo_(2024_version).svg",
    tr: "UEFA Avrupa Ligi",
    en: "UEFA Europa League",
  },
  {
    slug: "conference-league",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Conference_League_full_logo_(2024_version).svg",
    tr: "UEFA Konferans Ligi",
    en: "UEFA Conference League",
  },
] as const;

export default function CompetitionLinks({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  return (
    <section className="bg-[#07111f] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <Link
              key={item.slug}
              href={`/${locale}/${item.slug}`}
              className="group flex min-h-[132px] flex-col justify-between rounded-2xl border border-white/10 bg-[#101a29] p-4 transition active:scale-[.98] sm:min-h-[126px] sm:p-5 sm:hover:-translate-y-0.5 sm:hover:border-emerald-300/30 sm:hover:bg-white/[.06]"
            >
              <div className="flex items-start justify-between gap-3">
                {"logo" in item ? (
                  <span className="flex h-10 w-14 items-center justify-start sm:h-9 sm:w-12">
                    {/* External competition marks are displayed with a plain img to avoid Next image-host configuration. */}
                    <img
                      src={item.logo}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </span>
                ) : (
                  <span className="text-xl leading-none sm:text-lg">{item.emoji}</span>
                )}
                <span className="text-lg font-black text-emerald-300 transition-transform group-hover:translate-x-0.5">→</span>
              </div>
              <h3 className="mt-5 text-base font-black leading-tight sm:mt-4 sm:text-lg">
                {tr ? item.tr : item.en}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
