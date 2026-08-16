import type { MetadataRoute } from "next";

import { faceoffSlug } from "@/lib/faceoff-seo";
import { SITE_URL } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: Array<{
    path: string;
    changeFrequency: "daily" | "weekly";
    priority: number;
  }> = [
    // Turkish SEO/content landing pages that do not yet have localized duplicates.
    { path: "", changeFrequency: "daily", priority: 0.8 },
    { path: "/futbol-oyunlari", changeFrequency: "weekly", priority: 0.95 },
    { path: "/futbolcu-tahmin-oyunu", changeFrequency: "weekly", priority: 0.9 },
    { path: "/futbol-bilgi-yarismasi", changeFrequency: "weekly", priority: 0.9 },
    { path: "/football-wordle", changeFrequency: "weekly", priority: 0.9 },
    { path: "/messi-mi-ronaldo-mu", changeFrequency: "weekly", priority: 0.85 },
    { path: "/super-lig-efsaneleri", changeFrequency: "weekly", priority: 0.85 },
    { path: "/en-iyi-turk-futbolcular", changeFrequency: "weekly", priority: 0.8 },
    { path: "/halisaha-kadro-kurma", changeFrequency: "weekly", priority: 0.9 },
    { path: "/player-quiz", changeFrequency: "daily", priority: 0.9 },
    { path: "/club-nation", changeFrequency: "daily", priority: 0.9 },
    { path: "/transfer-quiz", changeFrequency: "daily", priority: 0.9 },
    { path: "/halisaha-kadro", changeFrequency: "weekly", priority: 0.9 },
    { path: "/halisaha-mac", changeFrequency: "weekly", priority: 0.8 },
    { path: "/takim-kadro", changeFrequency: "weekly", priority: 0.85 },
    { path: "/leaderboard", changeFrequency: "daily", priority: 0.7 },

    // Canonical localized core experience.
    { path: "/tr", changeFrequency: "daily", priority: 1 },
    { path: "/en", changeFrequency: "daily", priority: 1 },
    { path: "/tr/guess-the-player", changeFrequency: "daily", priority: 0.95 },
    { path: "/en/guess-the-player", changeFrequency: "daily", priority: 0.95 },
    { path: "/tr/career-path", changeFrequency: "daily", priority: 0.9 },
    { path: "/en/career-path", changeFrequency: "daily", priority: 0.9 },
    { path: "/tr/daily-faceoff", changeFrequency: "daily", priority: 1 },
    { path: "/en/daily-faceoff", changeFrequency: "daily", priority: 1 },
    { path: "/tr/survivor", changeFrequency: "daily", priority: 0.95 },
    { path: "/en/survivor", changeFrequency: "daily", priority: 0.95 },
    { path: "/tr/tic-tac-toe", changeFrequency: "daily", priority: 0.95 },
    { path: "/en/tic-tac-toe", changeFrequency: "daily", priority: 0.95 },
    { path: "/tr/wordle", changeFrequency: "daily", priority: 0.95 },
    { path: "/en/wordle", changeFrequency: "daily", priority: 0.95 },
    { path: "/tr/rank", changeFrequency: "daily", priority: 0.75 },
    { path: "/en/rank", changeFrequency: "daily", priority: 0.75 },
  ];

  const staticPages: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const [{ data: survivorSets }, { data: faceoffs }] = await Promise.all([
      supabaseAdmin
        .from("survivor_sets")
        .select("slug, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false }),
      supabaseAdmin
        .from("daily_faceoffs")
        .select("match_date, left_name, right_name, updated_at")
        .eq("is_active", true)
        .order("match_date", { ascending: false }),
    ]);

    const survivorPages: MetadataRoute.Sitemap = (survivorSets ?? []).flatMap((set) => [
      {
        url: `${SITE_URL}/tr/survivor/${set.slug}`,
        lastModified: set.updated_at ? new Date(set.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
      {
        url: `${SITE_URL}/en/survivor/${set.slug}`,
        lastModified: set.updated_at ? new Date(set.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
    ]);

    const faceoffPages: MetadataRoute.Sitemap = (faceoffs ?? []).flatMap((faceoff) => {
      const slug = faceoffSlug(faceoff);
      const lastModified = faceoff.updated_at ? new Date(faceoff.updated_at) : undefined;
      return [
        { url: `${SITE_URL}/tr/daily-faceoff/${slug}`, lastModified, changeFrequency: "weekly" as const, priority: 0.85 },
        { url: `${SITE_URL}/en/daily-faceoff/${slug}`, lastModified, changeFrequency: "weekly" as const, priority: 0.85 },
      ];
    });

    return [...staticPages, ...survivorPages, ...faceoffPages];
  } catch {
    return staticPages;
  }
}
