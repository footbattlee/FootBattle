"use client";

import { useMemo, useState } from "react";

import type { CompetitionKey, MatchRow } from "@/lib/football/competition-hubs";
import type { Locale } from "@/lib/i18n/config";

type RoundBucket = {
  key: string;
  label: string;
  sort: number;
  matches: MatchRow[];
};

function matchDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function TeamLogo({ src, name }: { src: string | null; name: string }) {
  if (!src) return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-black">{name.slice(0, 2).toUpperCase()}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="h-8 w-8 object-contain" />;
}

function MatchCard({ match, locale }: { match: MatchRow; locale: Locale }) {
  const tr = locale === "tr";
  const live = match.state === "in";
  const finished = match.state === "post";
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-bold text-slate-400">
        <span>{matchDate(match.date, locale)}</span>
        <span className={live ? "text-emerald-300" : finished ? "text-slate-400" : "text-cyan-300"}>
          {live ? (tr ? "CANLI" : "LIVE") : finished ? (tr ? "BİTTİ" : "FT") : (tr ? "YAKLAŞAN" : "UPCOMING")}
        </span>
      </div>
      <div className="space-y-3">
        {[match.home, match.away].map((team) => (
          <div key={`${match.id}-${team.id}`} className="flex items-center gap-3">
            <TeamLogo src={team.logo} name={team.name} />
            <span className="min-w-0 flex-1 truncate text-sm font-black text-white">{team.name}</span>
            {(finished || live) && <span className="text-xl font-black text-white">{team.score ?? "-"}</span>}
          </div>
        ))}
      </div>
    </article>
  );
}

function fallbackWeekNumber(date: string) {
  const seasonStart = new Date("2026-07-27T00:00:00Z").getTime();
  return Math.max(1, Math.floor((new Date(date).getTime() - seasonStart) / (7 * 86400000)) + 1);
}

function roundLabel(match: MatchRow, competition: CompetitionKey, locale: Locale) {
  const tr = locale === "tr";
  if (competition !== "champions-league" && match.roundNumber) return tr ? `${match.roundNumber}. Hafta` : `Matchweek ${match.roundNumber}`;
  if (match.roundLabel) return match.roundLabel;
  if (match.roundNumber) return tr ? `${match.roundNumber}. Hafta` : `Matchday ${match.roundNumber}`;
  const fallback = fallbackWeekNumber(match.date);
  return tr ? `${fallback}. Hafta` : `Week ${fallback}`;
}

function roundKey(match: MatchRow, competition: CompetitionKey) {
  if (competition !== "champions-league" && match.roundNumber) return `week-${match.roundNumber}`;
  if (match.roundLabel) return `label-${match.roundLabel}`;
  if (match.roundNumber) return `round-${match.roundNumber}`;
  return `fallback-${fallbackWeekNumber(match.date)}`;
}

function buildBuckets(matches: MatchRow[], competition: CompetitionKey, locale: Locale) {
  const map = new Map<string, RoundBucket>();
  for (const match of matches) {
    const key = roundKey(match, competition);
    const existing = map.get(key);
    const sort = match.roundNumber ?? new Date(match.date).getTime();
    if (existing) existing.matches.push(match);
    else map.set(key, { key, label: roundLabel(match, competition, locale), sort, matches: [match] });
  }
  return Array.from(map.values())
    .map((bucket) => ({ ...bucket, matches: [...bucket.matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) }))
    .sort((a, b) => a.sort - b.sort);
}

function RoundSection({
  title,
  subtitle,
  buckets,
  defaultKey,
  emptyText,
  locale,
}: {
  title: string;
  subtitle: string;
  buckets: RoundBucket[];
  defaultKey: string;
  emptyText: string;
  locale: Locale;
}) {
  const [selected, setSelected] = useState(defaultKey);
  const active = buckets.find((bucket) => bucket.key === selected) ?? buckets[0];

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        {buckets.length ? (
          <select
            value={active?.key ?? ""}
            onChange={(event) => setSelected(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0d1828] px-3 py-2.5 text-sm font-black text-white outline-none sm:w-auto"
            aria-label={title}
          >
            {buckets.map((bucket) => <option key={bucket.key} value={bucket.key}>{bucket.label}</option>)}
          </select>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {active?.matches.length ? active.matches.map((match) => <MatchCard key={match.id} match={match} locale={locale} />) : (
          <p className="rounded-2xl border border-white/10 p-5 text-sm text-slate-500">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export default function CompetitionMatchBrowser({
  competition,
  locale,
  matches,
}: {
  competition: CompetitionKey;
  locale: Locale;
  matches: MatchRow[];
}) {
  const tr = locale === "tr";
  const fixtureBuckets = useMemo(() => buildBuckets(matches.filter((match) => match.state !== "post"), competition, locale), [competition, locale, matches]);
  const resultBuckets = useMemo(() => buildBuckets(matches.filter((match) => match.state === "post"), competition, locale), [competition, locale, matches]);

  const now = Date.now();
  const nextFixture = fixtureBuckets.find((bucket) => bucket.matches.some((match) => new Date(match.date).getTime() >= now)) ?? fixtureBuckets[0];
  const lastResult = resultBuckets[resultBuckets.length - 1];

  return (
    <div className="space-y-8">
      <RoundSection
        title={tr ? "Yaklaşan Maçlar" : "Upcoming Fixtures"}
        subtitle={tr ? "Haftayı seçerek tüm fikstürü görüntüle · Türkiye saatiyle" : "Choose a matchweek to view the full fixture · Türkiye time"}
        buckets={fixtureBuckets}
        defaultKey={nextFixture?.key ?? ""}
        emptyText={tr ? "Yaklaşan maç bulunamadı." : "No upcoming fixtures found."}
        locale={locale}
      />
      <RoundSection
        title={tr ? "Sonuçlar" : "Results"}
        subtitle={tr ? "Önceki haftaların sonuçlarını görüntüle" : "Browse results from previous matchweeks"}
        buckets={resultBuckets}
        defaultKey={lastResult?.key ?? ""}
        emptyText={tr ? "Sonuç bulunamadı." : "No results found."}
        locale={locale}
      />
    </div>
  );
}
