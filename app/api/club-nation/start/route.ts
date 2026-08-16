import { NextResponse } from "next/server";

import { footballLocaleFromRequest, nationalityToDisplayName } from "@/lib/football/localization";
import { checkRateLimit, getRequestFingerprint } from "@/lib/server/simple-rate-limit";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GAME_DURATION_SECONDS = 120;
const STARTING_PASSES = 3;
const SCORE_PER_CORRECT = 20;

type PlayerRow = { player_id: number; name: string; nationality: string | null };
type ClubNationPairRow = { club_name: string; duel_tier: string; nationality: string; matching_player_count: number };

function shuffleArray<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

async function loadValidPairs() {
  const rows: ClubNationPairRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("club_nation_valid_pairs")
      .select("club_name, duel_tier, nationality, matching_player_count")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as ClubNationPairRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  if (!rows.length) throw new Error("Club Nation soru havuzu boş.");
  return rows;
}

async function findAnswerPlayer(clubName: string, nationality: string) {
  const { data: clubRows, error: clubError } = await supabaseAdmin
    .from("player_quiz_clubs")
    .select("player_id")
    .eq("club_name", clubName);
  if (clubError) throw clubError;
  const playerIds = Array.from(new Set((clubRows ?? []).map((row) => Number(row.player_id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (!playerIds.length) return null;

  const matchingPlayers: PlayerRow[] = [];
  for (let index = 0; index < playerIds.length; index += 200) {
    const chunk = playerIds.slice(index, index + 200);
    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, nationality")
      .in("player_id", chunk)
      .eq("nationality", nationality);
    if (error) throw error;
    matchingPlayers.push(...((data ?? []) as PlayerRow[]));
  }
  return matchingPlayers.length ? shuffleArray(matchingPlayers)[0] : null;
}

async function createQuestion() {
  const pairs = shuffleArray(await loadValidPairs());
  for (const pair of pairs) {
    const clubName = pair.club_name?.trim();
    const nationality = pair.nationality?.trim();
    if (!clubName || !nationality) continue;
    const player = await findAnswerPlayer(clubName, nationality);
    if (!player) continue;
    return { playerId: Number(player.player_id), clubName, nationality };
  }
  throw new Error("Uygun Club Nation sorusu üretilemedi.");
}

export async function POST(request: Request) {
  try {
    const locale = footballLocaleFromRequest(request);
    const fingerprint = getRequestFingerprint(request);
    const startLimit = checkRateLimit(`club-nation-start:${fingerprint}`, { limit: 15, windowMs: 60_000 });
    if (!startLimit.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı yeni oyun başlatıyorsun." }, { status: 429 });

    const authSupabase = await createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    const question = await createQuestion();
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + GAME_DURATION_SECONDS * 1000);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("one_club_one_country_sessions")
      .insert({
        player_id: question.playerId,
        club_name: question.clubName,
        nationality: question.nationality,
        user_id: user?.id ?? null,
        completed: false,
        won: null,
        score: 0,
        attempt_count: 0,
        correct_count: 0,
        wrong_count: 0,
        passes_left: STARTING_PASSES,
        question_no: 1,
        used_clubs: [question.clubName],
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id, score, correct_count, wrong_count, passes_left, question_no, used_clubs, started_at, expires_at")
      .single();
    if (sessionError || !session) throw sessionError ?? new Error("Session oluşturulamadı.");

    return NextResponse.json({
      ok: true,
      game: { code: "club_nation", label: locale === "en" ? "1 Club 1 Nation" : "1 Takım 1 Millet", durationSeconds: GAME_DURATION_SECONDS, scorePerCorrect: SCORE_PER_CORRECT, maxPasses: STARTING_PASSES },
      session: {
        id: session.id,
        startedAt: session.started_at,
        expiresAt: session.expires_at,
        score: Number(session.score ?? 0),
        correctCount: Number(session.correct_count ?? 0),
        wrongCount: Number(session.wrong_count ?? 0),
        passesLeft: Number(session.passes_left ?? STARTING_PASSES),
        questionNo: Number(session.question_no ?? 1),
        usedClubs: Array.isArray(session.used_clubs) ? session.used_clubs : [],
      },
      question: { club: question.clubName, nationality: nationalityToDisplayName(question.nationality, locale) },
    });
  } catch (error) {
    console.error("1 Takım 1 Millet start endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "1 Takım 1 Millet başlatılamadı." }, { status: 500 });
  }
}
