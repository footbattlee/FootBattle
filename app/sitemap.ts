import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://foot-battle.vercel.app";

  return [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/wordle`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/player-quiz`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/career-path`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/club-nation`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/halisaha-kadro`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}