import { notFound } from "next/navigation";

import UnifiedHomePage from "@/components/UnifiedHomePage";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <UnifiedHomePage locale={locale as Locale} />;
}
