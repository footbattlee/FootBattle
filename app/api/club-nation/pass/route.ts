import { NextResponse } from "next/server";

import { footballLocaleFromRequest, nationalityToDisplayName } from "@/lib/football/localization";
import { recordGameSecurityEvent } from "@/lib/game-security/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type PassBody = { sessionId?: string };
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
  const ids = Array.from(new Set((clubRows ?? []).map((row) => Number(row.player_id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (!ids.length) return null;
  const matches: PlayerRow[] = [];
  for (let index = 0; index < ids.length; index += 200) {
    const { data, error } = await supabaseAdmin.from("guess_players").select("player_id, name, nationality").in("player_id", ids.slice(index, index + 200)).eq("nationality", nationality);
    if (error) throw error;
    matches.push(...((data ?? []) as PlayerRow[]));
  }
  return matches.length ? shuffleArray(matches)[0] : null;
}

async function createQuestion(previousClub?: string, previousNationality?: string, usedClubs: string[] = []) {
  const used = new Set(usedClubs.map((club) => club?.trim().toLocaleLowerCase("tr-TR")).filter(Boolean));
  for (const pair of shuffleArray(await loadValidPairs())) {
    const clubName = pair.club_name?.trim();
    const nationality = pair.nationality?.trim();
    if (!clubName || !nationality) continue;
    if (used.has(clubName.toLocaleLowerCase("tr-TR"))) continue;
    if (previousClub && previousNationality && clubName === previousClub && nationality === previousNationality) continue;
    const player = await findAnswerPlayer(clubName, nationality);
    if (player) return { playerId: Number(player.player_id), clubName, nationality };
  }
  throw new Error("Kullanılmamış uygun Club Nation sorusu bulunamadı.");
}

export async function POST(request: Request) {
  try {
    const locale = footballLocaleFromRequest(request);
    const body = (await request.json()) as PassBody;
    const sessionId = body.sessionId?.trim();
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

    const passesLeft = Number(session.passes_left ?? 0);
    if (passesLeft <= 0) return NextResponse.json({ ok: false, error: "Pas hakkın kalmadı.", passesLeft: 0 }, { status: 409 });

    const eventResult = await recordGameSecurityEvent({
      request,
      gameCode: "club_nation",
      sourceSessionId: sessionId,
      eventType: "pass",
      payload: { questionNo: Number(session.question_no ?? 1) },
      maxPerMinute: 30,
    });
    if (!eventResult.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı işlem yapıyorsun." }, { status: 429 });

    const currentUsedClubs = Array.isArray(session.used_clubs) ? (session.used_clubs as string[]) : [];
    const nextQuestion = await createQuestion(session.club_name, session.nationality, currentUsedClubs);
    const newPassesLeft = passesLeft - 1;
    const newQuestionNo = Number(session.question_no ?? 1) + 1;
    const newUsedClubs = Array.from(new Set([...currentUsedClubs, nextQuestion.clubName]));

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("one_club_one_country_sessions")
      .update({ player_id: nextQuestion.playerId, club_name: nextQuestion.clubName, nationality: nextQuestion.nationality, passes_left: newPassesLeft, question_no: newQuestionNo, used_clubs: newUsedClubs })
      .eq("id", session.id)
      .eq("passes_left", passesLeft)
      .eq("completed", false)
      .select("club_name, nationality, score, correct_count, wrong_count, passes_left, question_no, used_clubs, expires_at")
      .maybeSingle();

    const latest = updatedSession ?? (await supabaseAdmin
      .from("one_club_one_country_sessions")
      .select("club_name, nationality, score, correct_count, wrong_count, passes_left, question_no, used_clubs, expires_at")
      .eq("id", session.id)
      .maybeSingle()).data;
    if (updateError || !latest) throw updateError ?? new Error("Oyun oturumu tekrar okunamadı.");

    return NextResponse.json({
      ok: true,
      passed: Boolean(updatedSession),
      alreadyProcessed: !updatedSession,
      score: Number(latest.score ?? 0),
      correctCount: Number(latest.correct_count ?? 0),
      wrongCount: Number(latest.wrong_count ?? 0),
      passesLeft: Number(latest.passes_left ?? 0),
      questionNo: Number(latest.question_no ?? 1),
      secondsLeft: Math.max(0, Math.ceil((new Date(latest.expires_at).getTime() - Date.now()) / 1000)),
      question: { club: latest.club_name, nationality: nationalityToDisplayName(latest.nationality, locale) },
      message: updatedSession ? "Pas geçildi." : "Pas isteği zaten işlendi.",
    });
  } catch (error) {
    console.error("1 Takım 1 Millet pass endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Pas kullanılırken hata oluştu." }, { status: 500 });
  }
}
