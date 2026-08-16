import { notFound } from "next/navigation";
import LocalizedRankPage from "@/components/i18n/LocalizedRankPage";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function RankLocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LocalizedRankPage locale={locale as Locale} />;
}
