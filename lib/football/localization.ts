import { nationalityToTurkish } from "@/lib/player-quiz/nationalities";

export type FootballLocale = "tr" | "en";

const LEAGUE_EN_MAP: Record<string, string> = {
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
  GR1: "Greek Super League",
  RU1: "Russian Premier League",
  UKR1: "Ukrainian Premier League",
  DK1: "Danish Superliga",
  NO1: "Eliteserien",
  SE1: "Allsvenskan",
  A1: "Austrian Bundesliga",
  PL1: "Ekstraklasa",
  C1: "Czech First League",
  RO1: "Romanian SuperLiga",
  SER1: "Serbian SuperLiga",
  KR1: "K League 1",
  JAP1: "J1 League",
  MLS1: "Major League Soccer",
  BRA1: "Brazilian Série A",
  ARG1: "Argentine Primera División",
  MEXA: "Liga MX",
};

const LEAGUE_TR_MAP: Record<string, string> = {
  ...LEAGUE_EN_MAP,
  GB1: "Premier Lig",
  SA1: "Suudi Pro Ligi",
  SC1: "İskoçya Premiership",
  GR1: "Yunanistan Süper Ligi",
  RU1: "Rusya Premier Ligi",
  UKR1: "Ukrayna Premier Ligi",
  DK1: "Danimarka Süper Ligi",
  A1: "Avusturya Bundesliga",
  C1: "Çekya 1. Ligi",
  RO1: "Romanya Süper Ligi",
  SER1: "Sırbistan Süper Ligi",
  BRA1: "Brezilya Série A",
  ARG1: "Arjantin Liga Profesional",
};

const PREFERRED_FOOT_TR_MAP: Record<string, string> = {
  right: "Sağ",
  left: "Sol",
  both: "İki Ayak",
  either: "İki Ayak",
  ambidextrous: "İki Ayak",
};

const PREFERRED_FOOT_EN_MAP: Record<string, string> = {
  right: "Right",
  left: "Left",
  both: "Both",
  either: "Both",
  ambidextrous: "Both",
};

const POSITION_TR_MAP: Record<string, string> = {
  goalkeeper: "Kaleci",
  keeper: "Kaleci",
  defender: "Defans",
  defence: "Defans",
  defense: "Defans",
  midfield: "Orta Saha",
  midfielder: "Orta Saha",
  attack: "Hücum",
  attacker: "Hücum",
  forward: "Forvet",
  striker: "Forvet",
  "centre-back": "Stoper",
  "center-back": "Stoper",
  "central defender": "Stoper",
  "left-back": "Sol Bek",
  "right-back": "Sağ Bek",
  "left back": "Sol Bek",
  "right back": "Sağ Bek",
  "defensive midfield": "Ön Libero",
  "central midfield": "Merkez Orta Saha",
  "attacking midfield": "Ofansif Orta Saha",
  "left midfield": "Sol Orta Saha",
  "right midfield": "Sağ Orta Saha",
  "left winger": "Sol Kanat",
  "right winger": "Sağ Kanat",
  winger: "Kanat",
  "centre-forward": "Santrfor",
  "center-forward": "Santrfor",
  "second striker": "İkinci Forvet",
};

const POSITION_EN_MAP: Record<string, string> = {
  goalkeeper: "Goalkeeper",
  keeper: "Goalkeeper",
  defender: "Defender",
  defence: "Defender",
  defense: "Defender",
  midfield: "Midfielder",
  midfielder: "Midfielder",
  attack: "Forward",
  attacker: "Forward",
  forward: "Forward",
  striker: "Striker",
  "centre-back": "Centre-Back",
  "center-back": "Centre-Back",
  "central defender": "Centre-Back",
  "left-back": "Left-Back",
  "right-back": "Right-Back",
  "left back": "Left-Back",
  "right back": "Right-Back",
  "defensive midfield": "Defensive Midfield",
  "central midfield": "Central Midfield",
  "attacking midfield": "Attacking Midfield",
  "left midfield": "Left Midfield",
  "right midfield": "Right Midfield",
  "left winger": "Left Winger",
  "right winger": "Right Winger",
  winger: "Winger",
  "centre-forward": "Centre-Forward",
  "center-forward": "Centre-Forward",
  "second striker": "Second Striker",
};

export function normalizeFootballText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeLookupValue(value: string | null | undefined) {
  return String(value ?? "").trim().toLocaleLowerCase("en-US");
}

function cookieLocale(request: Request): FootballLocale | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)footbattle_locale=(tr|en)(?:;|$)/);
  return match?.[1] === "en" ? "en" : match?.[1] === "tr" ? "tr" : null;
}

export function footballLocaleFromRequest(request: Request): FootballLocale {
  try {
    const url = new URL(request.url);
    const explicit = url.searchParams.get("lang") ?? url.searchParams.get("locale");
    if (explicit === "en") return "en";
    if (explicit === "tr") return "tr";

    const referer = request.headers.get("referer");
    if (referer) {
      const refererUrl = new URL(referer);
      const refererExplicit = refererUrl.searchParams.get("lang") ?? refererUrl.searchParams.get("locale");
      if (refererExplicit === "en") return "en";
      if (refererExplicit === "tr") return "tr";

      const pathname = refererUrl.pathname;
      if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
      if (pathname === "/tr" || pathname.startsWith("/tr/")) return "tr";
    }

    const persisted = cookieLocale(request);
    if (persisted) return persisted;
  } catch {
    const persisted = cookieLocale(request);
    if (persisted) return persisted;
  }
  return "tr";
}

export function leagueToDisplayName(value: string | null | undefined, locale: FootballLocale = "tr") {
  const raw = String(value ?? "").trim();
  if (!raw) return locale === "en" ? "Unknown" : "Bilinmiyor";
  const map = locale === "en" ? LEAGUE_EN_MAP : LEAGUE_TR_MAP;
  return map[raw.toUpperCase()] ?? raw;
}

export function nationalityToDisplayName(value: string | null | undefined, locale: FootballLocale = "tr") {
  const raw = String(value ?? "").trim();
  if (!raw) return locale === "en" ? "Unknown" : "Bilinmiyor";
  return locale === "en" ? raw : nationalityToTurkish(raw) || raw;
}

export function preferredFootToDisplayName(value: string | null | undefined, locale: FootballLocale = "tr") {
  const raw = String(value ?? "").trim();
  if (!raw) return locale === "en" ? "Unknown" : "Bilinmiyor";
  const map = locale === "en" ? PREFERRED_FOOT_EN_MAP : PREFERRED_FOOT_TR_MAP;
  return map[normalizeLookupValue(raw)] ?? raw;
}

export function positionToDisplayName(value: string | null | undefined, locale: FootballLocale = "tr") {
  const raw = String(value ?? "").trim();
  if (!raw) return locale === "en" ? "Unknown" : "Bilinmiyor";
  const map = locale === "en" ? POSITION_EN_MAP : POSITION_TR_MAP;
  return map[normalizeLookupValue(raw)] ?? raw;
}

export function localizeFootballAxisValue(
  type: "club" | "nationality" | "league" | "competition" | "position" | "preferredFoot" | "preferred_foot" | string,
  value: string | null | undefined,
  locale: FootballLocale = "tr",
) {
  if (type === "nationality") return nationalityToDisplayName(value, locale);
  if (type === "league" || type === "competition") return leagueToDisplayName(value, locale);
  if (type === "position") return positionToDisplayName(value, locale);
  if (type === "preferredFoot" || type === "preferred_foot") return preferredFootToDisplayName(value, locale);
  return String(value ?? "").trim() || (locale === "en" ? "Unknown" : "Bilinmiyor");
}

export function footballSearchMatches(
  type: "nationality" | "league" | "competition" | "position" | "preferredFoot" | "preferred_foot",
  canonicalValue: string | null | undefined,
  query: string,
  locale: FootballLocale,
) {
  const canonical = normalizeFootballText(canonicalValue);
  const localized = normalizeFootballText(localizeFootballAxisValue(type, canonicalValue, locale));
  const needle = normalizeFootballText(query);
  return Boolean(needle) && (canonical.includes(needle) || localized.includes(needle));
}
