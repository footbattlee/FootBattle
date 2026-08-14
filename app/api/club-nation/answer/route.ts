import { NextResponse } from "next/server";

import { nationalityToDisplayName } from "@/lib/football/localization";
import { recordGameSecurityEvent } from "@/lib/game-security/server";
import { nationalitiesAreEquivalent } from "@/lib/player-quiz/nationalities";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const SCORE_PER_CORRECT = 20;

type AnswerBody = { sessionId?: string; playerId?: number | null; answer?: string | null };
type PlayerRow = { player_id: number; name: string; name_normalized: string | null; nationality: string | null };
type ClubNationPairRow = { club_name: string; duel_tier: string; nationality: string; matching_player_count: number };

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ");
}
function shuffleArray<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

async function resolvePlayer(playerId: number | null, rawAnswer: string) {
  if (playerId && Number.isInteger(playerId) && playerId > 0) {
    const { data, error } = await supabaseAdmin.from("guess_players").select("player_id, name, name_normalized, nationality").eq("player_id", playerId).maybeSingle();
    if (error) throw error;
    return data ? { ok: true as const, player: data as PlayerRow } : { ok: false as const, status: 404, error: "Seçilen futbolcu bulunamadı." };
  }

  const normalizedAnswer = normalizeText(rawAnswer);
  if (normalizedAnswer.length < 2) return { ok: false as const, status: 400, error: "Futbolcu adı veya soyadı yazmalısın." };

  const { data: exactPlayers, error: exactError } = await supabaseAdmin
    .from("guess_players")
    .select("player_id, name, name_normalized, nationality")
    .eq("name_normalized", normalizedAnswer)
    .limit(10);
  if (exactError) throw exactError;
  if (exactPlayers?.length === 1) return { ok: true as const, player: exactPlayers[0] as PlayerRow };

  const { data: candidates, error: candidateError } = await supabaseAdmin
    .from("guess_players")
    .select("player_id, name, name_normalized, nationality")
    .ilike("name_normalized", `%${normalizedAnswer}%`)
    .limit(50);
  if (candidateError) throw candidateError;

  const surnameMatches = (candidates ?? []).filter((player) => {
    const parts = normalizeText(player.name_normalized ?? player.name ?? "").split(" ").filter(Boolean);
    return (parts[parts.length - 1] ?? "") === normalizedAnswer;
  });
  if (surnameMatches.length === 1) return { ok: true as const, player: surnameMatches[0] as PlayerRow };
  if (surnameMatches.length > 1) {
    return {
      ok: false as const,
      status: 409,
      ambiguous: true,
      error: "Bu soyadında birden fazla futbolcu bulundu. Listeden seçim yap.",
      players: surnameMatches.slice(0, 10).map((player) => ({ playerId: player.player_id, name: player.name, nationality: nationalityToDisplayName(player.nationality) })),
    };
  }
  return { ok: false as const, status: 404, error: "Bu isimde futbolcu bulunamadı." };
}

async function loadValidPairs() {
  const rows: ClubNationPairRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin.from("club_nation_valid_pairs").select("club_name, duel_tier, nationality, matching_player_count").range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as ClubNationPairRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function findAnswerPlayer(clubName: string, nationality: string) {
  const { data: clubRows, error: clubError } = await supabaseAdmin.from("player_quiz_clubs").select("player_id").eq("club_name", clubName);
  if (clubError) throw clubError;
  const playerIds = Array.from(new Set((clubRows ?? []).map((row) => Number(row.player_id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (!playerIds.length) return null;
  const matches: PlayerRow[] = [];
  for (let index = 0; index < playerIds.length; index += 200) {
    const { data, error } = await supabaseAdmin.from("guess_players").select("player_id, name, name_normalized, nationality").in("player_id", playerIds.slice(index, index + 200)).eq("nationality", nationality);
    if (error) throw error;
    matches.push(...((data ?? []) as PlayerRow[]));
  }
  return matches.length ? shuffleArray(matches)[0] : null;
}

async function createQuestion(previousClub?: string, previousNationality?: string, usedClubs: string[] = []) {
  const usedClubSet = new Set(usedClubs.map((club) => club?.trim().toLocaleLowerCase("tr-TR")).filter(Boolean));
  for (const pair of shuffleArray(await loadValidPairs())) {
    const clubName = pair.club_name?.trim();
    const nationality = pair.nationality?.trim();
    if (!clubName || !nationality) continue;
    if (usedClubSet.has(clubName.toLocaleLowerCase("tr-TR"))) continue;
    if (previousClub && previousNationality && clubName === previousClub && nationality === previousNationality) continue;
    const player = await findAnswerPlayer(clubName, nationality);
    if (player) return { playerId: Number(player.player_id), clubName, nationality };
  }
  throw new Error("Kullanılmamış uygun Club Nation sorusu bulunamadı.");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnswerBody;
    const sessionId = body.sessionId?.trim();
    const playerId = body.playerId ? Number(body.playerId) : null;
    const rawAnswer = body.answer?.trim() ?? "";
    if (!sessionId) return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });

    const authSupabase = await createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("one_club_one_country_sessions")
      .select("id, player_id, club_name, nationality, completed, score, attempt_count, correct_count, wrong_count, passes_left, question_no, used_clubs, user_id, started_at, expires_at, completed_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ ok: false, error: "Oyun bulunamadı." }, { status: 404 });
    if (session.user_id && session.user_id !== user?.id) return NextResponse.json({ ok: false, error: "Bu oyun oturumuna erişim yetkin yok." }, { status: 403 });
    if (session.completed) return NextResponse.json({ ok: true, completed: true, score: Number(session.score ?? 0), correctCount: Number(session.correct_count ?? 0), wrongCount: Number(session.wrong_count ?? 0), passesLeft: Number(session.passes_left ?? 0), completedAt: session.completed_at });

    const now = new Date();
    const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
    if (!expiresAt || now.getTime() >= expiresAt.getTime()) {
      await supabaseAdmin.from("one_club_one_country_sessions").update({ completed: true, completed_at: now.toISOString() }).eq("id", session.id).eq("completed", false);
      return NextResponse.json({ ok: true, completed: true, reason: "time_up", score: Number(session.score ?? 0), correctCount: Number(session.correct_count ?? 0), wrongCount: Number(session.wrong_count ?? 0), passesLeft: Number(session.passes_left ?? 0), message: "Süre doldu!" });
    }

    const eventResult = await recordGameSecurityEvent({
      request,
      gameCode: "club_nation",
      sourceSessionId: sessionId,
      eventType: "answer",
      payload: { playerId, answer: rawAnswer.slice(0, 100), questionNo: Number(session.question_no ?? 1) },
      maxPerMinute: 55,
    });
    if (!eventResult.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı cevap gönderiyorsun." }, { status: 429 });

    const resolved = await resolvePlayer(playerId, rawAnswer);
    if (!resolved.ok) return NextResponse.json(resolved, { status: resolved.status });
    const selectedPlayer = resolved.player;
    const nationalityCorrect = nationalitiesAreEquivalent(selectedPlayer.nationality, session.nationality);

    const { data: careerRows, error: careerError } = await supabaseAdmin.from("player_quiz_clubs").select("club_name").eq("player_id", selectedPlayer.player_id);
    if (careerError) throw careerError;
    const targetClub = normalizeText(session.club_name);
    const clubCorrect = (careerRows ?? []).some((row) => normalizeText(row.club_name ?? "") === targetClub);
    const isCorrect = nationalityCorrect && clubCorrect;

    const { error: attemptError } = await supabaseAdmin.from("one_club_one_country_attempts").insert({ session_id: session.id, player_id: selectedPlayer.player_id, answer_text: selectedPlayer.name, is_correct: isCorrect });
    if (attemptError) throw attemptError;

    if (!isCorrect) {
      const newAttemptCount = Number(session.attempt_count ?? 0) + 1;
      const newWrongCount = Number(session.wrong_count ?? 0) + 1;
      const { error } = await supabaseAdmin.from("one_club_one_country_sessions").update({ attempt_count: newAttemptCount, wrong_count: newWrongCount }).eq("id", session.id).eq("completed", false);
      if (error) throw error;
      return NextResponse.json({
        ok: true,
        correct: false,
        score: Number(session.score ?? 0),
        correctCount: Number(session.correct_count ?? 0),
        wrongCount: newWrongCount,
        attemptCount: newAttemptCount,
        passesLeft: Number(session.passes_left ?? 0),
        secondsLeft: Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
        question: { club: session.club_name, nationality: nationalityToDisplayName(session.nationality) },
        answer: { playerId: selectedPlayer.player_id, name: selectedPlayer.name },
        message: "Olmadı! Aynı soruda devam.",
      });
    }

    const currentUsedClubs = Array.isArray(session.used_clubs) ? (session.used_clubs as string[]) : [];
    const nextQuestion = await createQuestion(session.club_name, session.nationality, currentUsedClubs);
    const newScore = Number(session.score ?? 0) + SCORE_PER_CORRECT;
    const newCorrectCount = Number(session.correct_count ?? 0) + 1;
    const newAttemptCount = Number(session.attempt_count ?? 0) + 1;
    const newQuestionNo = Number(session.question_no ?? 1) + 1;
    const newUsedClubs = Array.from(new Set([...currentUsedClubs, nextQuestion.clubName]));

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("one_club_one_country_sessions")
      .update({ player_id: nextQuestion.playerId, club_name: nextQuestion.clubName, nationality: nextQuestion.nationality, score: newScore, correct_count: newCorrectCount, attempt_count: newAttemptCount, question_no: newQuestionNo, used_clubs: newUsedClubs })
      .eq("id", session.id)
      .eq("completed", false)
      .select("club_name, nationality, score, attempt_count, correct_count, wrong_count, passes_left, question_no, expires_at")
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      correct: true,
      completed: false,
      pointsEarned: SCORE_PER_CORRECT,
      score: Number(updatedSession.score ?? newScore),
      correctCount: Number(updatedSession.correct_count ?? newCorrectCount),
      wrongCount: Number(updatedSession.wrong_count ?? 0),
      attemptCount: Number(updatedSession.attempt_count ?? newAttemptCount),
      passesLeft: Number(updatedSession.passes_left ?? 0),
      questionNo: Number(updatedSession.question_no ?? newQuestionNo),
      secondsLeft: Math.max(0, Math.ceil((new Date(updatedSession.expires_at).getTime() - Date.now()) / 1000)),
      question: { club: updatedSession.club_name, nationality: nationalityToDisplayName(updatedSession.nationality) },
      answer: { playerId: selectedPlayer.player_id, name: selectedPlayer.name },
      message: `Doğru! +${SCORE_PER_CORRECT} puan`,
    });
  } catch (error) {
    console.error("1 Takım 1 Millet answer endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Cevap kontrol edilirken hata oluştu." }, { status: 500 });
  }
}
