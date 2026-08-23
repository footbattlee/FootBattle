import { notFound } from "next/navigation";

import DesktopHomeOnly from "@/components/mobile/DesktopHomeOnly";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <DesktopHomeOnly locale={locale as Locale} />;
}
