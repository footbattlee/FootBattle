export const RANKS = [
  { code: "bronze_3", name: "Bronz III", minLp: 0, icon: "/rank-badges/bronze.svg" },
  { code: "bronze_2", name: "Bronz II", minLp: 100, icon: "/rank-badges/bronze.svg" },
  { code: "bronze_1", name: "Bronz I", minLp: 200, icon: "/rank-badges/bronze.svg" },
  { code: "silver_3", name: "Gümüş III", minLp: 350, icon: "/rank-badges/silver.svg" },
  { code: "silver_2", name: "Gümüş II", minLp: 500, icon: "/rank-badges/silver.svg" },
  { code: "silver_1", name: "Gümüş I", minLp: 700, icon: "/rank-badges/silver.svg" },
  { code: "gold_3", name: "Altın III", minLp: 1000, icon: "/rank-badges/gold.svg" },
  { code: "gold_2", name: "Altın II", minLp: 1300, icon: "/rank-badges/gold.svg" },
  { code: "gold_1", name: "Altın I", minLp: 1600, icon: "/rank-badges/gold.svg" },
  { code: "platinum_3", name: "Platin III", minLp: 2000, icon: "/rank-badges/platinum.svg" },
  { code: "platinum_2", name: "Platin II", minLp: 2500, icon: "/rank-badges/platinum.svg" },
  { code: "platinum_1", name: "Platin I", minLp: 3000, icon: "/rank-badges/platinum.svg" },
  { code: "diamond_3", name: "Elmas III", minLp: 3700, icon: "/rank-badges/diamond.svg" },
  { code: "diamond_2", name: "Elmas II", minLp: 4500, icon: "/rank-badges/diamond.svg" },
  { code: "diamond_1", name: "Elmas I", minLp: 5500, icon: "/rank-badges/diamond.svg" },
  { code: "legend_3", name: "Efsane III", minLp: 7000, icon: "/rank-badges/legend.svg" },
  { code: "legend_2", name: "Efsane II", minLp: 8500, icon: "/rank-badges/legend.svg" },
  { code: "legend_1", name: "Efsane I", minLp: 10000, icon: "/rank-badges/legend.svg" },
  { code: "goat", name: "GOAT", minLp: 12500, icon: "/rank-badges/goat.svg" },
] as const;

export type RankCode = (typeof RANKS)[number]["code"];

export function getRankForLp(lp: number) {
  const safeLp = Math.max(0, Math.floor(lp || 0));
  let rank = RANKS[0];
  for (const candidate of RANKS) {
    if (safeLp >= candidate.minLp) rank = candidate;
    else break;
  }
  const index = RANKS.findIndex((item) => item.code === rank.code);
  const next = RANKS[index + 1] ?? null;
  return {
    ...rank,
    lp: safeLp,
    next,
    lpIntoRank: safeLp - rank.minLp,
    lpNeeded: next ? next.minLp - rank.minLp : 0,
    progressPercent: next ? Math.min(100, Math.round(((safeLp - rank.minLp) / Math.max(1, next.minLp - rank.minLp)) * 100)) : 100,
  };
}

export function getRankByCode(code?: string | null) {
  return RANKS.find((rank) => rank.code === code) ?? RANKS[0];
}
