import { NextResponse } from "next/server";

import { buildPlayerQuizSeniorCareer, type RawPlayerQuizClub } from "@/lib/player-quiz/clubs";
import { getSharedSoloChallengeId } from "@/lib/shared-solo-challenge";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LIVES = 5;
const GUESS_TIME_SECONDS = 30;
const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_POPULARITY_SCORE = 84;

type CandidatePlayer = {
  player_id: number;
  name: string;
  image_url: string | null;
  nationality: string | null;
  popularity_score: number | null;
};

type Prepared = { player: CandidatePlayer; career: ReturnType<typeof buildPlayerQuizSeniorCareer> };

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function prepareCandidate(candidate: CandidatePlayer): Promise<Prepared | null> {
  const [detailResult, clubsResult] = await Promise.all([
    supabaseAdmin.from("player_quiz_details").select("birth_year").eq("player_id", candidate.player_id).maybeSingle(),
    supabaseAdmin
      .from("player_quiz_clubs")
      .select("id, club_name, career_order")
      .eq("player_id", candidate.player_id)
      .not("club_name", "is", null)
      .order("career_order", { ascending: true }),
  ]);

  if (detailResult.error || clubsResult.error) return null;
  const birthYear = Number(detailResult.data?.birth_year ?? 0);
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2100 || !candidate.nationality?.trim()) return null;

  const career = buildPlayerQuizSeniorCareer((clubsResult.data ?? []) as RawPlayerQuizClub[]);
  if (!career.length) return null;
  return { player: candidate, career };
}

async function loadPlayer(playerId: number) {
  const { data, error } = await supabaseAdmin
    .from("guess_players")
    .select("player_id, name, image_url, nationality, popularity_score")
    .eq("player_id", playerId)
    .eq("is_playable", 1)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as CandidatePlayer) : null;
}

async function sharedCandidate(challengeId: string) {
  const { data: source, error } = await supabaseAdmin
    .from("player_quiz_sessions")
    .select("player_id")
    .eq("id", challengeId)
    .maybeSingle();
  if (error) throw error;
  if (!source?.player_id) return null;
  const player = await loadPlayer(Number(source.player_id));
  return player ? prepareCandidate(player) : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dailyMode = url.searchParams.get("daily") === "1";
    const challengeId = getSharedSoloChallengeId(request);

    let selected: Prepared | null = null;

    if (challengeId) {
      selected = await sharedCandidate(challengeId);
      if (!selected) return NextResponse.json({ ok: false, error: "Paylaşılan Player Quiz bulunamadı." }, { status: 404 });
    } else if (dailyMode) {
      const { data: dailyRow, error: dailyError } = await supabaseAdmin
        .from("daily_player_quiz")
        .select("player_id, is_published")
        .eq("play_date", getTurkeyDateKey())
        .eq("is_published", true)
        .maybeSingle();
      if (dailyError) throw dailyError;
      if (!dailyRow) return NextResponse.json({ ok: false, error: "Bugünün Player Quiz'i henüz yayınlanmadı." }, { status: 404 });
      const player = await loadPlayer(Number(dailyRow.player_id));
      selected = player ? await prepareCandidate(player) : null;
      if (!selected) return NextResponse.json({ ok: false, error: "Bugünün Player Quiz oyuncusunun gerekli bilgileri eksik." }, { status: 422 });
    } else {
      const { data: candidates, error } = await supabaseAdmin
        .from("guess_players")
        .select("player_id, name, image_url, nationality, popularity_score")
        .eq("is_playable", 1)
        .gte("popularity_score", MINIMUM_POPULARITY_SCORE)
        .not("nationality", "is", null)
        .order("popularity_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      if (!candidates?.length) return NextResponse.json({ ok: false, error: "Player Quiz için uygun oyuncu bulunamadı." }, { status: 404 });

      const randomStart = Math.floor(Math.random() * candidates.length);
      const ordered = [...candidates.slice(randomStart), ...candidates.slice(0, randomStart)] as CandidatePlayer[];
      for (const candidate of ordered.slice(0, 100)) {
        const prepared = await prepareCandidate(candidate);
        if (prepared) { selected = prepared; break; }
      }
    }

    if (!selected) return NextResponse.json({ ok: false, error: "Player Quiz için uygun oyuncu seçilemedi." }, { status: 404 });

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("player_quiz_sessions")
      .insert({ player_id: selected.player.player_id, max_lives: MAX_LIVES, guess_time_seconds: GUESS_TIME_SECONDS })
      .select("id, max_lives, guess_time_seconds")
      .single();
    if (sessionError || !session) throw sessionError ?? new Error("Yeni Player Quiz oyunu oluşturulamadı.");

    return NextResponse.json({
      ok: true,
      mode: challengeId ? "challenge" : dailyMode ? "daily" : "random",
      daily: dailyMode,
      challenge: Boolean(challengeId),
      sessionId: session.id,
      player: { id: Number(selected.player.player_id), fullName: selected.player.name, imageUrl: selected.player.image_url ?? null },
      maxLives: session.max_lives,
      guessTimeSeconds: session.guess_time_seconds,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      minimumPopularityScore: MINIMUM_POPULARITY_SCORE,
      board: {
        birthYearSlots: 1,
        nationalitySlots: 1,
        clubSlots: selected.career.length,
        totalSlots: selected.career.length + 2,
      },
      scoring: { completionScore: 500 },
    });
  } catch (error) {
    console.error("Player Quiz today endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Yeni Player Quiz hazırlanırken hata oluştu." }, { status: 500 });
  }
}
