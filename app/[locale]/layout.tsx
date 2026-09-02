import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const isEnglish = locale === "en";
  const title = isEnglish
    ? "FootBattle | Football Games, Quizzes and Challenges"
    : "FootBattle | Futbol Oyunları, Quizler ve Kapışmalar";
  const description = isEnglish
    ? "Play football quizzes, daily faceoffs, Survivor challenges and competitive ranked games on FootBattle."
    : "FootBattle'da futbol quizleri, günlük kapışmalar, Survivor ve rekabetçi rank oyunlarını oyna.";

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        tr: `${SITE_URL}/tr`,
        en: `${SITE_URL}/en`,
        "x-default": `${SITE_URL}/tr`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}`,
      locale: isEnglish ? "en_US" : "tr_TR",
      alternateLocale: [isEnglish ? "tr_TR" : "en_US"],
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div data-locale={locale as Locale} lang={locale}>
      {children}
    </div>
  );
}
