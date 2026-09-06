import { NextResponse } from "next/server";

import { getSharedSoloChallengeId } from "@/lib/shared-solo-challenge";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_WRONG_GUESSES = 5;
const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_POPULARITY_SCORE = 84;
const MINIMUM_CLUB_COUNT = 3;
const MAXIMUM_CLUB_COUNT = 12;

type CandidatePlayer = { player_id: number; name: string; image_url: string | null; popularity_score: number | null };
type RawCareerClub = { id: number; club_name: string; career_order: number | null };
type CareerClub = { id: number; name: string; careerOrder: number };

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[.\-_/]/g, " ").replace(/\s+/g, " ").trim();
}

function isYouthClubName(value: unknown) {
  const clubName = normalizeText(value);
  if (!clubName) return true;
  return /\bu\s?\d{2}\b|\byth\b|\byouth\b|\bacademy\b|\bakademi\b|\breserve\b|\breserves\b|\bprimavera\b|\bjuvenil\b|\bjuniors?\b/.test(clubName);
}

function normalizeClubName(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const removableWords = new Set(["fc", "afc", "cf", "sc", "sk", "fk", "ac", "football", "club", "futbol", "futebol"]);
  return normalized.split(" ").filter((word) => word && !removableWords.has(word)).join(" ").trim();
}

function buildSeniorCareer(rawClubs: RawCareerClub[]): CareerClub[] {
  const unique = new Map<string, { id: number; name: string; originalOrder: number }>();
  const sorted = rawClubs
    .filter((club) => !isYouthClubName(club.club_name))
    .sort((a, b) => Number(a.career_order ?? 999999) - Number(b.career_order ?? 999999));

  for (const club of sorted) {
    const key = normalizeClubName(club.club_name);
    if (!key || unique.has(key)) continue;
    unique.set(key, { id: Number(club.id), name: club.club_name, originalOrder: Number(club.career_order ?? 0) });
  }

  return Array.from(unique.values())
    .sort((a, b) => a.originalOrder - b.originalOrder)
    .map((club, index) => ({ id: club.id, name: club.name, careerOrder: index + 1 }));
}

async function loadCareer(playerId: number) {
  const { data, error } = await supabaseAdmin
    .from("player_quiz_clubs")
    .select("id, club_name, career_order")
    .eq("player_id", playerId)
    .not("club_name", "is", null)
    .order("career_order", { ascending: true });
  if (error) throw error;
  return buildSeniorCareer((data ?? []) as RawCareerClub[]);
}

async function loadPlayer(playerId: number) {
  const { data, error } = await supabaseAdmin
    .from("guess_players")
    .select("player_id, name, image_url, popularity_score")
    .eq("player_id", playerId)
    .eq("is_playable", 1)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as CandidatePlayer) : null;
}

export async function GET(request: Request) {
  try {
    const challengeId = getSharedSoloChallengeId(request);
    let selectedPlayer: CandidatePlayer | null = null;
    let selectedCareer: CareerClub[] = [];

    if (challengeId) {
      const { data: source, error: sourceError } = await supabaseAdmin
        .from("career_path_sessions")
        .select("player_id")
        .eq("id", challengeId)
        .maybeSingle();
      if (sourceError) throw sourceError;
      if (!source?.player_id) return NextResponse.json({ ok: false, error: "Paylaşılan Career Path bulunamadı." }, { status: 404 });
      selectedPlayer = await loadPlayer(Number(source.player_id));
      if (selectedPlayer) selectedCareer = await loadCareer(selectedPlayer.player_id);
    } else {
      const { data: candidates, error } = await supabaseAdmin
        .from("guess_players")
        .select("player_id, name, image_url, popularity_score")
        .eq("is_playable", 1)
        .gte("popularity_score", MINIMUM_POPULARITY_SCORE)
        .not("name", "is", null)
        .order("popularity_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      if (!candidates?.length) return NextResponse.json({ ok: false, error: "Career Path için uygun oyuncu bulunamadı." }, { status: 404 });

      const randomStart = Math.floor(Math.random() * candidates.length);
      const ordered = [...candidates.slice(randomStart), ...candidates.slice(0, randomStart)] as CandidatePlayer[];
      for (const candidate of ordered.slice(0, 150)) {
        const career = await loadCareer(candidate.player_id);
        if (career.length < MINIMUM_CLUB_COUNT || career.length > MAXIMUM_CLUB_COUNT) continue;
        selectedPlayer = candidate;
        selectedCareer = career;
        break;
      }
    }

    if (!selectedPlayer || selectedCareer.length < MINIMUM_CLUB_COUNT || selectedCareer.length > MAXIMUM_CLUB_COUNT) {
      return NextResponse.json({ ok: false, error: challengeId ? "Paylaşılan Career Path artık oynanabilir değil." : "Career Path için uygun A takım kariyerine sahip oyuncu seçilemedi." }, { status: challengeId ? 404 : 500 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("career_path_sessions")
      .insert({ player_id: selectedPlayer.player_id, max_wrong_guesses: MAX_WRONG_GUESSES })
      .select("id, player_id, max_wrong_guesses, created_at")
      .single();
    if (sessionError || !session) throw sessionError ?? new Error("Yeni Career Path oyunu oluşturulamadı.");

    return NextResponse.json({
      ok: true,
      mode: challengeId ? "challenge" : "random",
      challenge: Boolean(challengeId),
      sessionId: session.id,
      player: { id: Number(selectedPlayer.player_id), fullName: selectedPlayer.name, imageUrl: selectedPlayer.image_url ?? null },
      board: { clubSlots: selectedCareer.length },
      maxWrongGuesses: session.max_wrong_guesses,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      scoring: { zeroWrong: 250, oneWrong: 200, twoWrong: 150, threeWrong: 100, fourWrong: 50, fiveWrong: 0 },
      settings: { minimumPopularityScore: MINIMUM_POPULARITY_SCORE, minimumClubCount: MINIMUM_CLUB_COUNT, maximumClubCount: MAXIMUM_CLUB_COUNT },
    });
  } catch (error) {
    console.error("Career Path today endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Yeni Career Path oyunu hazırlanırken hata oluştu." }, { status: 500 });
  }
}
