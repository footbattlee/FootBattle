import { NextResponse } from "next/server";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type SupportedGame =
  | "guess_the_player"
  | "player_quiz"
  | "tic_tac_toe"
  | "wordle";

type Body = {
  game?: SupportedGame;
  sessionId?: string;
  daily?: boolean;
};

const GAME_ATTEMPTED_COLUMN: Record<SupportedGame, string> = {
  guess_the_player: "guess_the_player_attempted",
  player_quiz: "player_quiz_attempted",
  tic_tac_toe: "tic_tac_toe_attempted",
  wordle: "wordle_attempted",
};

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nextDailyGame(progress: Record<string, unknown>) {
  const games = [
    {
      attempted: "guess_the_player_attempted",
      href: "/guess-the-player?daily=1",
      label: "Guess The Player",
    },
    {
      attempted: "player_quiz_attempted",
      href: "/player-quiz?daily=1",
      label: "Player Quiz",
    },
    {
      attempted: "tic_tac_toe_attempted",
      href: "/tic-tac-toe?daily=1",
      label: "Tic Tac Toe",
    },
    {
      attempted: "wordle_attempted",
      href: "/wordle?daily=1",
      label: "Wordle",
    },
  ];

  return games.find((item) => !Boolean(progress[item.attempted])) ?? null;
}

async function incrementPlayed(userId: string | undefined) {
  if (!userId) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("games_played")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return;

  await supabaseAdmin
    .from("profiles")
    .update({ games_played: Number(profile.games_played ?? 0) + 1 })
    .eq("id", userId);
}

async function surrenderGuessThePlayer(sessionId: string, userId?: string) {
  const { data: session, error } = await supabaseAdmin
    .from("guess_player_sessions")
    .select("id, player_id, completed, result_applied, attempt_count, user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) throw new Error("Guess The Player oturumu bulunamadı.");

  const { data: player } = await supabaseAdmin
    .from("guess_players")
    .select("name, current_club_name, nationality")
    .eq("player_id", session.player_id)
    .maybeSingle();

  let applied = false;

  if (!session.result_applied) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("guess_player_sessions")
      .update({
        completed: true,
        result_applied: true,
        won: false,
        score: 0,
        attempt_count: Number(session.attempt_count ?? 0),
        user_id: userId ?? session.user_id ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("result_applied", false)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    applied = Boolean(updated);
  }

  if (applied) await incrementPlayed(userId);

  return {
    score: 0,
    answerTitle: player?.name ?? "Gizli oyuncu",
    answerDetail: [player?.current_club_name, player?.nationality]
      .filter(Boolean)
      .join(" · ") || null,
  };
}

async function surrenderPlayerQuiz(sessionId: string, userId?: string) {
  const { data: session, error } = await supabaseAdmin
    .from("player_quiz_sessions")
    .select("id, player_id, completed, result_applied, attempt_count, user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) throw new Error("Player Quiz oturumu bulunamadı.");

  const playerId = Number(session.player_id);
  const [playerResult, detailResult, clubsResult] = await Promise.all([
    supabaseAdmin
      .from("guess_players")
      .select("name, nationality")
      .eq("player_id", playerId)
      .maybeSingle(),
    supabaseAdmin
      .from("player_quiz_details")
      .select("birth_year")
      .eq("player_id", playerId)
      .maybeSingle(),
    supabaseAdmin
      .from("player_quiz_clubs")
      .select("id, club_name, career_order")
      .eq("player_id", playerId)
      .not("club_name", "is", null)
      .order("career_order", { ascending: true }),
  ]);

  const clubs = buildPlayerQuizSeniorCareer(
    (clubsResult.data ?? []) as RawPlayerQuizClub[],
  );

  let applied = false;

  if (!session.result_applied) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("player_quiz_sessions")
      .update({
        completed: true,
        result_applied: true,
        won: false,
        score: 0,
        attempt_count: Number(session.attempt_count ?? 0),
        user_id: userId ?? session.user_id ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("result_applied", false)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    applied = Boolean(updated);
  }

  if (applied) await incrementPlayed(userId);

  const detailLines = [
    detailResult.data?.birth_year
      ? `Doğum yılı: ${detailResult.data.birth_year}`
      : null,
    playerResult.data?.nationality
      ? `Milliyet: ${playerResult.data.nationality}`
      : null,
    clubs.length > 0
      ? `Kulüpler: ${clubs.map((club) => club.name).join(" → ")}`
      : null,
  ].filter(Boolean);

  return {
    score: 0,
    answerTitle: playerResult.data?.name ?? "Oyuncu",
    answerDetail: detailLines.join("\n") || null,
  };
}

async function surrenderWordle(sessionId: string, userId?: string) {
  const { data: session, error } = await supabaseAdmin
    .from("wordle_sessions")
    .select("id, player_id, answer_normalized, completed, result_applied, attempt_count, user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) throw new Error("Wordle oturumu bulunamadı.");

  const { data: player } = await supabaseAdmin
    .from("guess_players")
    .select("name")
    .eq("player_id", session.player_id)
    .maybeSingle();

  let applied = false;

  if (!session.result_applied) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("wordle_sessions")
      .update({
        completed: true,
        result_applied: true,
        won: false,
        score: 0,
        attempt_count: Number(session.attempt_count ?? 0),
        user_id: userId ?? session.user_id ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("result_applied", false)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    applied = Boolean(updated);
  }

  if (applied) await incrementPlayed(userId);

  return {
    score: 0,
    answerTitle: String(session.answer_normalized ?? "Doğru cevap"),
    answerDetail: player?.name ? `Oyuncu: ${player.name}` : null,
  };
}

async function surrenderTicTacToe(sessionId: string) {
  const { data: session, error } = await supabaseAdmin
    .from("tic_tac_toe_sessions")
    .select("id, score, correct_count, wrong_count, completed")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) throw new Error("Tic Tac Toe oturumu bulunamadı.");

  if (!session.completed) {
    const { error: updateError } = await supabaseAdmin
      .from("tic_tac_toe_sessions")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("completed", false);

    if (updateError) throw updateError;
  }

  return {
    score: Number(session.score ?? 0),
    answerTitle: "Grid sonlandırıldı",
    answerDetail: `${Number(session.correct_count ?? 0)}/9 doğru hücre · ${Number(
      session.score ?? 0,
    )} puan`,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const game = body.game;
    const sessionId = String(body.sessionId ?? "").trim();

    if (!game || !GAME_ATTEMPTED_COLUMN[game] || !sessionId) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz pes et isteği." },
        { status: 400 },
      );
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    let result:
      | Awaited<ReturnType<typeof surrenderGuessThePlayer>>
      | Awaited<ReturnType<typeof surrenderPlayerQuiz>>
      | Awaited<ReturnType<typeof surrenderWordle>>
      | Awaited<ReturnType<typeof surrenderTicTacToe>>;

    if (game === "guess_the_player") {
      result = await surrenderGuessThePlayer(sessionId, user?.id);
    } else if (game === "player_quiz") {
      result = await surrenderPlayerQuiz(sessionId, user?.id);
    } else if (game === "wordle") {
      result = await surrenderWordle(sessionId, user?.id);
    } else {
      result = await surrenderTicTacToe(sessionId);
    }

    let nextHref: string | null = null;
    let nextLabel: string | null = null;

    if (body.daily && user) {
      const challengeDate = getTodayDate();
      const attemptedColumn = GAME_ATTEMPTED_COLUMN[game];

      const { data: existing } = await supabaseAdmin
        .from("daily_challenge_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("challenge_date", challengeDate)
        .maybeSingle();

      if (existing?.id) {
        await supabaseAdmin
          .from("daily_challenge_progress")
          .update({ [attemptedColumn]: true } as Record<string, boolean>)
          .eq("id", existing.id);
      }

      const { data: progress } = await supabaseAdmin
        .from("daily_challenge_progress")
        .select(
          "guess_the_player_attempted, player_quiz_attempted, tic_tac_toe_attempted, wordle_attempted",
        )
        .eq("user_id", user.id)
        .eq("challenge_date", challengeDate)
        .maybeSingle();

      if (progress) {
        const next = nextDailyGame(progress as Record<string, unknown>);
        nextHref = next?.href ?? null;
        nextLabel = next?.label ?? null;
      }
    }

    return NextResponse.json({
      ok: true,
      surrendered: true,
      ...result,
      nextHref,
      nextLabel,
    });
  } catch (error) {
    console.error("Game surrender error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Oyun sonlandırılırken hata oluştu.",
      },
      { status: 500 },
    );
  }
}
