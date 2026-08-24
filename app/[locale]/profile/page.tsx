import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AccountDeletionPanel from "@/components/account/AccountDeletionPanel";
import LocalizedProfilePage from "@/components/i18n/LocalizedProfilePage";
import MobileProfilePage from "@/components/mobile/MobileProfilePage";
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
  const typedLocale = locale as Locale;
  return (
    <>
      <div className="md:hidden"><MobileProfilePage locale={typedLocale} /></div>
      <div className="hidden md:block"><LocalizedProfilePage locale={typedLocale} /></div>
      <div className="bg-[#07111f] px-4 pb-24 text-white">
        <AccountDeletionPanel locale={typedLocale} />
      </div>
    </>
  );
}
