import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobileRankPage from "@/components/mobile/MobileRankPage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";
import styles from "./rank-parity.module.css";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Rank Arena | FootBattle" : "Rank Arenası | FootBattle",
    description: en
      ? "Find ranked matches, climb the seasonal LP leaderboard and compare solo performance."
      : "Ranked maç bul, sezonluk LP sıralamasında yüksel ve solo performansını karşılaştır.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/rank`,
      languages: {
        tr: `${SITE_URL}/tr/rank`,
        en: `${SITE_URL}/en/rank`,
        "x-default": `${SITE_URL}/tr/rank`,
      },
    },
  };
}

export default async function RankLocalePage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className={styles.shell}>
      <MobileRankPage locale={locale as Locale} />
    </div>
  );
}
