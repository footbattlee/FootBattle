import type { Metadata } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

// playfootbattle.com is the canonical production origin. Keep previews and any
// stale Vercel env value from leaking foot-battle.vercel.app into SEO metadata.
export const SITE_URL =
  configuredSiteUrl && !configuredSiteUrl.endsWith("vercel.app")
    ? configuredSiteUrl
    : "https://playfootbattle.com";

export const BRAND_NAME = "FootBattle";
export const BRAND_ALTERNATE_NAMES = ["PlayFootBattle", "Play FootBattle", "playfootbattle.com"];
export const BRAND_DESCRIPTION =
  "FootBattle (playfootbattle.com) is an independent browser-based football trivia and games platform with quizzes, guessing games, Tic Tac Toe, Wordle-style games and competitive challenges.";

export const DEFAULT_OG_IMAGE = "/footbattle-logo.png";

export const NO_INDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  },
};

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

export function createGameMetadata({
  path,
  title,
  description,
  keywords,
}: GameSeoConfig): Metadata {
  const canonical = `${SITE_URL}${path}`;

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: BRAND_NAME,
      title,
      description,
      url: canonical,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          alt: "FootBattle futbol oyunları",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND_NAME,
    alternateName: BRAND_ALTERNATE_NAMES,
    description: BRAND_DESCRIPTION,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/footbattle-logo.png`,
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BRAND_NAME,
    alternateName: BRAND_ALTERNATE_NAMES,
    description: BRAND_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: ["tr-TR", "en-US"],
  };

  const webApplication = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#webapp`,
    name: BRAND_NAME,
    alternateName: BRAND_ALTERNATE_NAMES,
    description: BRAND_DESCRIPTION,
    url: SITE_URL,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern web browser with JavaScript enabled",
    isAccessibleForFree: true,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: ["tr-TR", "en-US"],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplication) }} />
    </>
  );
}

export function GameJsonLd({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Game",
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: "tr-TR",
    applicationCategory: "Game",
    genre: ["Football", "Sports", "Quiz"],
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
