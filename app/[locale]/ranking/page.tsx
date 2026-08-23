import { notFound } from "next/navigation";

import MobileLeaderboardPage from "@/components/mobile/MobileLeaderboardPage";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function RankingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <MobileLeaderboardPage locale={locale as Locale} />;
}
