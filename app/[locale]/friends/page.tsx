import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocalizedProfilePage from "@/components/i18n/LocalizedProfilePage";
import { isLocale, type Locale } from "@/lib/i18n/config";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FriendsLocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LocalizedProfilePage locale={locale as Locale} />;
}
