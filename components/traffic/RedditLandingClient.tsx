"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { CAMPAIGNS, campaignSearchParams } from "@/lib/analytics/campaign";
import { trackEvent } from "@/lib/analytics/track-event";

const games = [
  { href: "/en/guess-the-player", icon: "🕵️", title: "Guess the Player", text: "Use clues to identify the footballer before your guesses run out." },
  { href: "/en/career-path", icon: "🛣️", title: "Career Path", text: "Can you rebuild a footballer's career club by club?" },
  { href: "/en/survivor", icon: "🏆", title: "Football Survivor", text: "Pick winners through a 16-entry bracket and crown your champion." },
  { href: "/en/wordle", icon: "🟩", title: "Footballer Wordle", text: "Find the hidden footballer one letter pattern at a time." },
] as const;

function campaignParams() {
  if (typeof window === "undefined") return campaignSearchParams(CAMPAIGNS.redditLaunch);
  const current = new URLSearchParams(window.location.search);
  return campaignSearchParams({
    source: current.get("utm_source") || CAMPAIGNS.redditLaunch.source,
    medium: current.get("utm_medium") || CAMPAIGNS.redditLaunch.medium,
    campaign: current.get("utm_campaign") || CAMPAIGNS.redditLaunch.campaign,
    content: current.get("utm_content"),
    term: current.get("utm_term"),
  });
}

export default function RedditLandingClient() {
  const params = useMemo(() => campaignParams(), []);

  useEffect(() => {
    const key = `footbattle_reddit_landing_${params.toString()}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");

    void trackEvent({
      eventName: "game_started",
      gameName: "reddit_campaign_landing",
      pagePath: window.location.pathname,
      metadata: {
        source: params.get("utm_source"),
        medium: params.get("utm_medium"),
        campaign: params.get("utm_campaign"),
        content: params.get("utm_content"),
        term: params.get("utm_term"),
        referrer: document.referrer || null,
      },
    });
  }, [params]);

  function href(path: string) {
    return `${path}?${params.toString()}`;
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-12">
        <nav className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link href="/en" className="text-xl font-black text-green-300">FootBattle</Link>
          <Link href="/en" className="text-xs font-black text-slate-400 hover:text-white">All games →</Link>
        </nav>

        <section className="py-14 text-center sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-green-300">Built for football obsessives</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Think your football knowledge is elite?</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-lg">No installs. No paywall. Pick a challenge, play instantly and see if you actually know ball.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => (
            <Link key={game.href} href={href(game.href)} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-0.5 hover:border-green-400/30 hover:bg-white/[0.055]">
              <div className="text-3xl">{game.icon}</div>
              <h2 className="mt-4 text-2xl font-black group-hover:text-green-200">{game.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{game.text}</p>
              <p className="mt-5 text-sm font-black text-green-300">Play now →</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-yellow-300/15 bg-yellow-300/[0.05] p-6 text-center">
          <p className="text-sm font-black text-yellow-100">Free to play · Mobile friendly · Rank up from Bronze to GOAT 🐐</p>
        </section>
      </div>
    </main>
  );
}
