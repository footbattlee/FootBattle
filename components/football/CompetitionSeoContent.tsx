import Link from "next/link";

import { COMPETITIONS, type CompetitionKey, type CompetitionSnapshot } from "@/lib/football/competition-hubs";
import type { Locale } from "@/lib/i18n/config";
import { BreadcrumbJsonLd, FAQJsonLd, JsonLd, SITE_URL } from "@/lib/seo";

function dateText(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function CompetitionSeoContent({
  competition,
  locale,
  snapshot,
}: {
  competition: CompetitionKey;
  locale: Locale;
  snapshot: CompetitionSnapshot;
}) {
  const tr = locale === "tr";
  const config = COMPETITIONS[competition];
  const name = tr ? config.trName : config.enName;
  const path = `/${locale}/${competition}`;
  const url = `${SITE_URL}${path}`;
  const upcoming = snapshot.matches.filter((match) => match.state === "pre").slice(0, 8);
  const completed = snapshot.matches.filter((match) => match.state === "post");
  const nextMatch = upcoming[0];

  const faqs = tr
    ? [
        {
          question: `${name} puan durumu nereden takip edilir?`,
          answer: `FootBattle ${name} merkezinde 2026/27 sezonunun güncel puan durumunu, oynanan maçları ve puanları tek sayfada gösterir.`,
        },
        {
          question: `${name} fikstürü ve maç sonuçları nerede?`,
          answer: `Yaklaşan maçlar ve tamamlanan karşılaşmalar hafta veya tur seçerek FootBattle üzerinden görüntülenebilir. Maç saatleri Türkiye saatine göre gösterilir.`,
        },
        {
          question: `${name} maçlarına skor tahmini yapılabilir mi?`,
          answer: `Evet. Giriş yapan FootBattle kullanıcıları maç başlamadan önce skor tahmini yapabilir ve tahminlerini başlangıç saatine kadar değiştirebilir.`,
        },
      ]
    : [
        {
          question: `Where can I follow the ${name} standings?`,
          answer: `The FootBattle ${name} hub shows the current 2026/27 standings, matches played and points in one place.`,
        },
        {
          question: `Where can I see ${name} fixtures and results?`,
          answer: `Upcoming fixtures and completed matches can be browsed by matchweek or round on FootBattle. Match times are displayed in Türkiye time.`,
        },
        {
          question: `Can I predict ${name} match scores?`,
          answer: `Yes. Signed-in FootBattle users can submit score predictions before kickoff and edit them until the match starts.`,
        },
      ];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: tr ? `${name} Puan Durumu, Fikstür ve Sonuçlar` : `${name} Standings, Fixtures and Results`,
        description: tr
          ? `${name} 2026/27 puan durumu, fikstür, maç sonuçları, takım sayfaları ve skor tahminleri.`
          : `${name} 2026/27 standings, fixtures, results, team pages and score predictions.`,
        inLanguage: tr ? "tr-TR" : "en-US",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${url}#competition` },
      },
      {
        "@type": "SportsOrganization",
        "@id": `${url}#competition`,
        name,
        sport: "Football",
        url,
        member: snapshot.standings.slice(0, 40).map((team) => ({
          "@type": "SportsTeam",
          name: team.teamName,
          ...(team.logo ? { logo: team.logo } : {}),
          url: `${SITE_URL}/${locale}/${competition}/team/${team.teamId}`,
        })),
      },
      ...(upcoming.length
        ? [{
            "@type": "ItemList",
            "@id": `${url}#upcoming-matches`,
            name: tr ? `${name} yaklaşan maçlar` : `${name} upcoming matches`,
            itemListElement: upcoming.map((match, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "SportsEvent",
                name: `${match.home.name} - ${match.away.name}`,
                startDate: match.date,
                sport: "Football",
                homeTeam: { "@type": "SportsTeam", name: match.home.name },
                awayTeam: { "@type": "SportsTeam", name: match.away.name },
                eventStatus: "https://schema.org/EventScheduled",
              },
            })),
          }]
        : []),
    ],
  };

  return (
    <>
      <JsonLd data={graph} />
      <BreadcrumbJsonLd
        items={[
          { name: "FootBattle", path: `/${locale}` },
          { name: tr ? "Ligler ve Turnuvalar" : "Leagues and Tournaments", path: `/${locale}/competitions` },
          { name },
        ]}
      />
      <FAQJsonLd faqs={faqs} />

      <section className="mt-10 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">{tr ? "2026/27 LİG REHBERİ" : "2026/27 COMPETITION GUIDE"}</p>
        <h2 className="mt-2 text-2xl font-black">{tr ? `${name} puan durumu, fikstür ve maç sonuçları` : `${name} standings, fixtures and results`}</h2>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
          {tr
            ? `FootBattle'da ${name} sezonunu tek ekrandan takip edebilirsin. Güncel puan durumu, hafta veya tur bazlı fikstür, tamamlanan maçların skorları ve takım sayfaları aynı veri akışında bir araya gelir.`
            : `Follow the ${name} season in one place on FootBattle. Current standings, fixtures by matchweek or round, completed results and team pages are combined in the same football data experience.`}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d1828] p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{tr ? "Takım" : "Teams"}</p>
            <p className="mt-1 text-2xl font-black">{snapshot.standings.length || "—"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1828] p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{tr ? "Tamamlanan Maç" : "Completed Matches"}</p>
            <p className="mt-1 text-2xl font-black">{completed.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1828] p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{tr ? "Sıradaki Maç" : "Next Match"}</p>
            <p className="mt-1 text-sm font-black">{nextMatch ? dateText(nextMatch.date, locale) : (tr ? "Henüz açıklanmadı" : "Not announced yet")}</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-black">{tr ? `${name} hakkında sık sorulanlar` : `Frequently asked questions about ${name}`}</h3>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <summary className="cursor-pointer text-sm font-black text-white">{faq.question}</summary>
                <p className="mt-3 text-sm leading-6 text-slate-400">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3 text-xs font-black">
          <Link href={`/${locale}/competitions`} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 hover:bg-white/[.08]">
            {tr ? "Tüm ligleri gör" : "See all competitions"}
          </Link>
          <Link href={`/${locale}/games`} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 hover:bg-white/[.08]">
            {tr ? "Futbol oyunlarını oyna" : "Play football games"}
          </Link>
        </div>
      </section>
    </>
  );
}
