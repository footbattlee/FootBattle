import { notFound } from "next/navigation";
import MobileDuelsPage from "@/components/mobile/MobileDuelsPage";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function DuelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <MobileDuelsPage locale={locale as Locale} />;
}
