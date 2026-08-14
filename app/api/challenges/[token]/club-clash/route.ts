import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { localizeFootballAxisValue } from "@/lib/football/localization";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ token: string }> };
type ChallengeSide = "challenger" | "opponent";
type WinnerSide = ChallengeSide | "draw" | null;

type ChallengeRow = {
  id: number;
  invite_token: string;
  game_code: string;
  status: string;
  challenger_user_id: string | null;
  challenger_guest_id: string | null;
  opponent_user_id: string | null;
  opponent_guest_id: string | null;
  challenger_name: string | null;
  opponent_name: string | null;
  challenger_score: number;
  opponent_score: number;
  winner_side: "challenger" | "opponent" | "draw" | null;
  created_at: string;
  joined_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

type ChallengeRoundRow = {
  id: number;
  challenge_id: number;
  round_no: number;
  game_code: string;
  left_type: string;
  left_value: string;
  right_type: string;
  right_value: string;
  winner_side: "challenger" | "opponent" | "draw" | null;
  challenger_answer: string | null;
  opponent_answer: string | null;
  challenger_answer_player_id: number | null;
  opponent_answer_player_id: number | null;
  challenger_answered_at: string | null;
  opponent_answered_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const GUEST_COOKIE_NAME = "footbattle_guest";
const WIN_SCORE = 3;
const ROUND_COUNT = 5;

function sanitizeToken(value: unknown) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

function serializeRound(round: ChallengeRoundRow) {
  return {
    id: Number(round.id),
    roundNo: Number(round.round_no),
    left: {
      type: round.left_type,
      value: localizeFootballAxisValue(round.left_type, round.left_value),
    },
    right: {
      type: round.right_type,
      value: localizeFootballAxisValue(round.right_type, round.right_value),
    },
    winnerSide: round.winner_side,
    challengerAnswer: round.challenger_answer,
    opponentAnswer: round.opponent_answer,
    challengerAnswerPlayerId: round.challenger_answer_player_id ? Number(round.challenger_answer_player_id) : null,
    opponentAnswerPlayerId: round.opponent_answer_player_id ? Number(round.opponent_answer_player_id) : null,
    challengerAnsweredAt: round.challenger_answered_at,
    opponentAnsweredAt: round.opponent_answered_at,
    completedAt: round.completed_at,
    createdAt: round.created_at,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token: rawToken } = await context.params;
    const token = sanitizeToken(rawToken);
    if (!token) return NextResponse.json({ ok: false, error: "Geçerli challenge bulunamadı." }, { status: 400 });

    const authSupabase = await createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    const cookieStore = await cookies();
    const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value ?? null;

    const { data: challengeData, error: challengeError } = await supabaseAdmin
      .from("guest_challenges")
      .select(`
        id, invite_token, game_code, status,
        challenger_user_id, challenger_guest_id,
        opponent_user_id, opponent_guest_id,
        challenger_name, opponent_name,
        challenger_score, opponent_score, winner_side,
        created_at, joined_at, started_at, completed_at, updated_at
      `)
      .eq("invite_token", token)
      .maybeSingle();

    if (challengeError) throw challengeError;
    if (!challengeData) return NextResponse.json({ ok: false, error: "Challenge bulunamadı." }, { status: 404 });
    const challenge = challengeData as ChallengeRow;
    if (challenge.game_code !== "club_clash") return NextResponse.json({ ok: false, error: "Bu challenge 2 Takım 1 Oyuncu değil." }, { status: 409 });

    const isChallenger = user
      ? challenge.challenger_user_id === user.id
      : Boolean(guestId && challenge.challenger_guest_id === guestId);
    const isOpponent = user
      ? challenge.opponent_user_id === user.id
      : Boolean(guestId && challenge.opponent_guest_id === guestId);
    if (!isChallenger && !isOpponent) return NextResponse.json({ ok: false, error: "Bu challenge'a erişim yetkin yok." }, { status: 403 });
    const role: ChallengeSide = isChallenger ? "challenger" : "opponent";

    const { data: roundsData, error: roundsError } = await supabaseAdmin
      .from("challenge_rounds")
      .select(`
        id, challenge_id, round_no, game_code,
        left_type, left_value, right_type, right_value,
        winner_side, challenger_answer, opponent_answer,
        challenger_answer_player_id, opponent_answer_player_id,
        challenger_answered_at, opponent_answered_at,
        completed_at, created_at
      `)
      .eq("challenge_id", challenge.id)
      .eq("game_code", "club_clash")
      .order("round_no", { ascending: true });
    if (roundsError) throw roundsError;

    const rounds = (roundsData ?? []) as ChallengeRoundRow[];
    const currentRound = rounds.find((round) => round.completed_at === null) ?? null;
    const completedRounds = rounds.filter((round) => round.completed_at !== null);
    const calculatedChallengerScore = completedRounds.filter((round) => round.winner_side === "challenger").length;
    const calculatedOpponentScore = completedRounds.filter((round) => round.winner_side === "opponent").length;
    const challengerScore = Math.max(Number(challenge.challenger_score ?? 0), calculatedChallengerScore);
    const opponentScore = Math.max(Number(challenge.opponent_score ?? 0), calculatedOpponentScore);

    let winnerSide: WinnerSide = challenge.winner_side;
    if (!winnerSide && challengerScore >= WIN_SCORE) winnerSide = "challenger";
    if (!winnerSide && opponentScore >= WIN_SCORE) winnerSide = "opponent";

    const myName = role === "challenger" ? challenge.challenger_name : challenge.opponent_name;
    const opponentName = role === "challenger" ? challenge.opponent_name : challenge.challenger_name;
    const myScore = role === "challenger" ? challengerScore : opponentScore;
    const opponentScoreForRole = role === "challenger" ? opponentScore : challengerScore;

    let result: "win" | "loss" | "draw" | null = null;
    if (challenge.status === "completed") {
      if (winnerSide === "draw") result = "draw";
      else if (winnerSide === role) result = "win";
      else if (winnerSide) result = "loss";
    }

    return NextResponse.json({
      ok: true,
      role,
      game: { code: "club_clash", label: "2 Takım 1 Oyuncu", roundCount: ROUND_COUNT, winScore: WIN_SCORE },
      challenge: {
        id: Number(challenge.id),
        token: challenge.invite_token,
        status: challenge.status,
        startedAt: challenge.started_at,
        completedAt: challenge.completed_at,
        createdAt: challenge.created_at,
        updatedAt: challenge.updated_at,
      },
      players: {
        challenger: { name: challenge.challenger_name, score: challengerScore },
        opponent: { name: challenge.opponent_name, score: opponentScore },
      },
      me: { side: role, name: myName, score: myScore },
      opponent: { side: role === "challenger" ? "opponent" : "challenger", name: opponentName, score: opponentScoreForRole },
      score: { challenger: challengerScore, opponent: opponentScore },
      roundCount: rounds.length,
      completedRoundCount: completedRounds.length,
      currentRound: currentRound ? serializeRound(currentRound) : null,
      rounds: rounds.map(serializeRound),
      winnerSide,
      completed: challenge.status === "completed",
      result,
    });
  } catch (error) {
    console.error("Guest Club Clash GET endpoint hatası:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "2 Takım 1 Oyuncu bilgileri okunamadı." },
      { status: 500 },
    );
  }
}
