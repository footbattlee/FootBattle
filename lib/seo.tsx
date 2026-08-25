import type { Metadata } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

// playfootbattle.com is the canonical production origin. Keep previews and any
// stale Vercel env value from leaking foot-battle.vercel.app into SEO metadata.
export const SITE_URL =
  configuredSiteUrl && !configuredSiteUrl.endsWith("vercel.app")
    ? configuredSiteUrl
    : "https://playfootbattle.com";

export const DEFAULT_OG_IMAGE = "/footbattle-logo.png";

export function localizedAlternates(path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return {
    tr: `${SITE_URL}/tr${suffix}`,
    en: `${SITE_URL}/en${suffix}`,
    "x-default": `${SITE_URL}/tr${suffix}`,
  };
}

type GameSeoConfig = {
  path: string;
  title: string;
  description: string;
  keywords: string[];
};

export function createGameMetadata({ path, title, description, keywords }: GameSeoConfig): Metadata {
  const canonical = `${SITE_URL}${path}`;

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: "FootBattle",
      title,
      description,
      url: canonical,
      images: [{ url: DEFAULT_OG_IMAGE, alt: "FootBattle futbol oyunları" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
  };
}

export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "FootBattle",
    alternateName: ["Play FootBattle", "playfootbattle"],
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/footbattle-logo.png`,
    },
    description: "FootBattle is a football games and quiz platform with daily challenges, player guessing games, Career Path, Wordle, Tic Tac Toe, Survivor and competitive modes.",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "FootBattle",
    alternateName: ["Play FootBattle", "playfootbattle.com"],
    description: "Football games, quizzes, daily challenges and competitive football trivia on FootBattle.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: ["tr-TR", "en"],
  };

  const webApplication = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#app`,
    name: "FootBattle",
    alternateName: "Play FootBattle",
    url: SITE_URL,
    applicationCategory: "GameApplication",
    applicationSubCategory: "Football games and quizzes",
    operatingSystem: "Web, Android",
    browserRequirements: "Requires JavaScript",
    description: "Play FootBattle football quizzes, player guessing games, Career Path, Wordle, Tic Tac Toe, Survivor and competitive challenges.",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplication) }} />
    </>
  );
}

export function GameJsonLd({ name, description, path }: { name: string; description: string; path: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Game",
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: "tr-TR",
    applicationCategory: "Game",
    genre: ["Football", "Sports", "Quiz"],
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
