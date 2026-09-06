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

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

function serializeJsonLd(value: JsonLdValue) {
  // Prevent user/content strings from ever closing the script tag while
  // keeping valid JSON-LD output for crawlers.
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function SiteJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BRAND_NAME,
        alternateName: BRAND_ALTERNATE_NAMES,
        description: BRAND_DESCRIPTION,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#logo`,
          url: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
          contentUrl: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
          caption: BRAND_NAME,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: BRAND_NAME,
        alternateName: BRAND_ALTERNATE_NAMES,
        description: BRAND_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: ["tr-TR", "en-US"],
      },
      {
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
        image: { "@id": `${SITE_URL}/#logo` },
        inLanguage: ["tr-TR", "en-US"],
      },
    ],
  };

  return <JsonLd data={graph} />;
}

export function GameJsonLd({
  name,
  description,
  path,
  inLanguage = "tr-TR",
  genre = ["Football", "Sports", "Quiz"],
}: {
  name: string;
  description: string;
  path: string;
  inLanguage?: "tr-TR" | "en-US";
  genre?: string[];
}) {
  const url = `${SITE_URL}${path}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Game", "WebApplication"],
    "@id": `${url}#game`,
    name,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern web browser with JavaScript enabled",
    isAccessibleForFree: true,
    genre,
    image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
  };

  return <JsonLd data={schema} />;
}

export function FAQJsonLd({
  faqs,
}: {
  faqs: Array<{ question: string; answer: string }>;
}) {
  if (!faqs.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return <JsonLd data={schema} />;
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; path?: string }>;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
    })),
  };

  return <JsonLd data={schema} />;
}
