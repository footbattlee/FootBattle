import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<{
    path: string;
    changeFrequency: "daily" | "weekly";
    priority: number;
  }> = [
    { path: "", changeFrequency: "daily", priority: 1 },
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

  return pages.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
