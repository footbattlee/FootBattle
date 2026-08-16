import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocalizedProfilePage from "@/components/i18n/LocalizedProfilePage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "My Profile | FootBattle" : "Profilim | FootBattle",
    description: en ? "View your FootBattle score, rank, friends and friend requests." : "FootBattle skorunu, rankını, arkadaşlarını ve arkadaşlık isteklerini görüntüle.",
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/${locale}/profile` },
  };
}

export default async function ProfileLocalePage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LocalizedProfilePage locale={locale as Locale} />;
}
