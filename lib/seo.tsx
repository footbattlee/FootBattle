import type { Metadata } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

// playfootbattle.com is the canonical production origin. Keep previews and any
// stale Vercel env value from leaking foot-battle.vercel.app into SEO metadata.
export const SITE_URL =
  configuredSiteUrl && !configuredSiteUrl.endsWith("vercel.app")
    ? configuredSiteUrl
    : "https://playfootbattle.com";

export const DEFAULT_OG_IMAGE = "/footbattle-logo.png";

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
      siteName: "FootBattle",
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
      "@type": "Organization",
      name: "FootBattle",
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
