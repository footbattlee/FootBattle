import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import GeoAnswerSection from "@/components/GeoAnswerSection";
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
      {en ? (
        <GeoAnswerSection
          title="What is the Football Career Path Quiz?"
          summary="FootBattle's Football Career Path Quiz is a free browser game where you identify the clubs in a footballer's career in the correct sequence. It tests your knowledge of transfers, former teams and player histories."
          howItWorks={[
            "Study the career path and the missing club positions.",
            "Use the known teams and timeline as clues.",
            "Enter the missing clubs to complete the player's career journey.",
          ]}
          faqs={[
            {
              question: "What does Career Path test?",
              answer: "It tests how well you remember a footballer's club history, including transfers and the order in which the player represented different teams.",
            },
            {
              question: "Is the Career Path Quiz free?",
              answer: "Yes. FootBattle's Career Path Quiz is free to play in a web browser.",
            },
            {
              question: "How can I get better at Career Path?",
              answer: "Focus on major transfers, academy clubs, loan spells and the chronological order of teams in well-known players' careers.",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
