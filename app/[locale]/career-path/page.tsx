import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import LocalizedCareerPath from "@/components/i18n/LocalizedCareerPath";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { GameJsonLd, SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Football Career Path Quiz | FootBattle" : "Kariyer Yolu | FootBattle",
    description: en ? "Complete a footballer's career path by naming the clubs they played for." : "Futbolcunun kariyer yolunu forma giydiği kulüpleri bularak tamamla.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/career-path`,
      languages: localizedAlternates("/career-path"),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const description = en
    ? "Complete a footballer's career path by naming the clubs they played for."
    : "Futbolcunun kariyer yolunu forma giydiği kulüpleri bularak tamamla.";

  return (
    <div data-game="career-path">
      <GameJsonLd
        name={en ? "Football Career Path Quiz" : "Kariyer Yolu"}
        description={description}
        path={`/${locale}/career-path`}
        inLanguage={en ? "en-US" : "tr-TR"}
      />
      <Suspense fallback={null}>
        <LocalizedCareerPath locale={locale as Locale} />
      </Suspense>
    </div>
  );
}
