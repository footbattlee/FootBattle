import { notFound } from "next/navigation";
import MobileDailyChallengePage from "@/components/mobile/MobileDailyChallengePage";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function DailyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <MobileDailyChallengePage locale={locale as Locale} />;
}
