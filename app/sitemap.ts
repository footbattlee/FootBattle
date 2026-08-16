import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: Array<{
    path: string;
    changeFrequency: "daily" | "weekly";
    priority: number;
  }> = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/futbol-oyunlari", changeFrequency: "weekly", priority: 0.95 },
    { path: "/futbolcu-tahmin-oyunu", changeFrequency: "weekly", priority: 0.9 },
    { path: "/futbol-bilgi-yarismasi", changeFrequency: "weekly", priority: 0.9 },
    { path: "/football-wordle", changeFrequency: "weekly", priority: 0.9 },
    { path: "/messi-mi-ronaldo-mu", changeFrequency: "weekly", priority: 0.85 },
    { path: "/super-lig-efsaneleri", changeFrequency: "weekly", priority: 0.85 },
    { path: "/en-iyi-turk-futbolcular", changeFrequency: "weekly", priority: 0.8 },
    { path: "/halisaha-kadro-kurma", changeFrequency: "weekly", priority: 0.9 },
    { path: "/guess-the-player", changeFrequency: "daily", priority: 0.95 },
    { path: "/player-quiz", changeFrequency: "daily", priority: 0.95 },
    { path: "/wordle", changeFrequency: "daily", priority: 0.95 },
    { path: "/career-path", changeFrequency: "daily", priority: 0.9 },
    { path: "/club-nation", changeFrequency: "daily", priority: 0.9 },
    { path: "/tic-tac-toe", changeFrequency: "daily", priority: 0.95 },
    { path: "/transfer-quiz", changeFrequency: "daily", priority: 0.9 },
    { path: "/gunun-kapismasi", changeFrequency: "daily", priority: 1 },
    { path: "/survivor", changeFrequency: "daily", priority: 0.95 },
    { path: "/halisaha-kadro", changeFrequency: "weekly", priority: 0.9 },
    { path: "/halisaha-mac", changeFrequency: "weekly", priority: 0.8 },
    { path: "/takim-kadro", changeFrequency: "weekly", priority: 0.85 },
    { path: "/leaderboard", changeFrequency: "daily", priority: 0.7 },
  ];

  const staticPages: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const { data: survivorSets } = await supabaseAdmin
      .from("survivor_sets")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    const survivorPages: MetadataRoute.Sitemap = (survivorSets ?? []).map((set) => ({
      url: `${SITE_URL}/survivor/${set.slug}`,
      lastModified: set.updated_at ? new Date(set.updated_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    return [...staticPages, ...survivorPages];
  } catch {
    return staticPages;
  }
}
