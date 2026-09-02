import type { Metadata } from "next";

import { isLocale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const en = locale === "en";
  const title = en
    ? "Daily Faceoff | Football Player Battles | FootBattle"
    : "Günün Kapışması | Futbolcu Karşılaştırmaları | FootBattle";
  const description = en
    ? "Vote in FootBattle Daily Faceoff, compare two footballers and see what the community thinks. A new football battle every day."
    : "FootBattle Günün Kapışması'nda iki futbolcu arasında seçimini yap, topluluğun oylarını gör ve her gün yeni bir futbol kapışmasına katıl.";
  const canonical = `${SITE_URL}/${locale}/daily-faceoff`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: {
        tr: `${SITE_URL}/tr/daily-faceoff`,
        en: `${SITE_URL}/en/daily-faceoff`,
        "x-default": `${SITE_URL}/tr/daily-faceoff`,
      },
    },
    openGraph: {
      type: "website",
      siteName: "FootBattle",
      title,
      description,
      url: canonical,
      locale: en ? "en_US" : "tr_TR",
      alternateLocale: [en ? "tr_TR" : "en_US"],
      images: [
        {
          url: `${SITE_URL}/footbattle-logo.png`,
          alt: en ? "FootBattle Daily Faceoff" : "FootBattle Günün Kapışması",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/footbattle-logo.png`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function DailyFaceoffLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
