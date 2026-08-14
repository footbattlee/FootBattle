import { nationalityToTurkish } from "@/lib/player-quiz/nationalities";

const LEAGUE_TR_MAP: Record<string, string> = {
  GB1: "Premier League",
  GB2: "Championship",
  GB3: "League One",
  GB4: "League Two",
  ES1: "LaLiga",
  ES2: "LaLiga 2",
  IT1: "Serie A",
  IT2: "Serie B",
  L1: "Bundesliga",
  L2: "2. Bundesliga",
  FR1: "Ligue 1",
  FR2: "Ligue 2",
  PO1: "Liga Portugal",
  PO2: "Liga Portugal 2",
  TR1: "Süper Lig",
  TR2: "1. Lig",
  SA1: "Saudi Pro League",
  NL1: "Eredivisie",
  NL2: "Eerste Divisie",
  BE1: "Jupiler Pro League",
  SC1: "Scottish Premiership",
  GR1: "Yunanistan Süper Ligi",
  RU1: "Rusya Premier Ligi",
  UKR1: "Ukrayna Premier Ligi",
  DK1: "Danimarka Süper Ligi",
  NO1: "Eliteserien",
  SE1: "Allsvenskan",
  A1: "Avusturya Bundesliga",
  PL1: "Ekstraklasa",
  C1: "Çekya 1. Ligi",
  RO1: "Romanya Süper Ligi",
  SER1: "Sırbistan Süper Ligi",
  KR1: "K League 1",
  JAP1: "J1 League",
  MLS1: "Major League Soccer",
  BRA1: "Brezilya Série A",
  ARG1: "Arjantin Liga Profesional",
  MEXA: "Liga MX",
};

export function leagueToDisplayName(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Bilinmiyor";
  return LEAGUE_TR_MAP[raw.toUpperCase()] ?? raw;
}

export function nationalityToDisplayName(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Bilinmiyor";
  return nationalityToTurkish(raw) || raw;
}

export function localizeFootballAxisValue(
  type: "club" | "nationality" | string,
  value: string | null | undefined,
) {
  if (type === "nationality") return nationalityToDisplayName(value);
  return String(value ?? "").trim() || "Bilinmiyor";
}
