import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";
import { nationalitiesAreEquivalent } from "@/lib/player-quiz/nationalities";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME = "footbattle_guest";

type FieldType = "birthYear" | "nationality" | "club";
type Role = "challenger" | "opponent";
type AnswerBody = { field?: FieldType; value?: string | number };

type ChallengeRow = {
  id: number | string;
  invite_token: string;
  game_code: string;
  status: string;
  challenger_user_id: string | null;
  challenger_guest_id: string | null;
  opponent_user_id: string | null;
  opponent_guest_id: string | null;
};

type GameRow = {
  challenge_id: number | string;
  player_id: number | string;
  challenger_birth_year_correct: boolean;
  opponent_birth_year_correct: boolean;
  challenger_nationality_correct: boolean;
  opponent_nationality_correct: boolean;
  challenger_solved_club_ids: number[] | string[] | null;
  opponent_solved_club_ids: number[] | string[] | null;
  challenger_attempt_count: number;
  opponent_attempt_count: number;
  challenger_finalized: boolean;
  opponent_finalized: boolean;
  challenger_forfeited: boolean;
  opponent_forfeited: boolean;
};

function sanitizeToken(value: unknown) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ");
}

function isAllowedField(value: unknown): value is FieldType {
  return value === "birthYear" || value === "nationality" || value === "club";
}

function parseStoredClubIds(value: number[] | string[] | null | undefined) {
  if (!Array.isArray(value)) return [] as number[];
  return Array.from(new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
}

function calculateCorrectCount({
  birthYearCorrect,
  nationalityCorrect,
  solvedClubIds,
}: {
  birthYearCorrect: boolean;
  nationalityCorrect: boolean;
  solvedClubIds: number[];
}) {
  return (birthYearCorrect ? 1 : 0) + (nationalityCorrect ? 1 : 0) + solvedClubIds.length;
}

function roleState(game: GameRow, role: Role) {
  return {
    birthYearCorrect: role === "challenger" ? Boolean(game.challenger_birth_year_correct) : Boolean(game.opponent_birth_year_correct),
    nationalityCorrect: role === "challenger" ? Boolean(game.challenger_nationality_correct) : Boolean(game.opponent_nationality_correct),
    solvedClubIds: role === "challenger" ? parseStoredClubIds(game.challenger_solved_club_ids) : parseStoredClubIds(game.opponent_solved_club_ids),
    attemptCount: role === "challenger" ? Number(game.challenger_attempt_count ?? 0) : Number(game.opponent_attempt_count ?? 0),
    finalized: role === "challenger" ? Boolean(game.challenger_finalized) : Boolean(game.opponent_finalized),
    forfeited: role === "challenger" ? Boolean(game.challenger_forfeited) : Boolean(game.opponent_forfeited),
  };
}

function progressPayload(
  birthYearCorrect: boolean,
  nationalityCorrect: boolean,
  solvedClubIds: number[],
  totalCount: number,
  attemptCount: number,
) {
  return {
    birthYearCorrect,
    nationalityCorrect,
    solvedClubIds,
    correctCount: calculateCorrectCount({ birthYearCorrect, nationalityCorrect, solvedClubIds }),
    totalCount,
    attemptCount,
  };
}

async function updateRoleState(challengeId: number | string, role: Role, payload: Record<string, unknown>) {
  const prefixed = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [`${role}_${key}`, value]),
  );
  const { error } = await supabaseAdmin
    .from("guest_challenge_player_quiz")
    .update({ ...prefixed, updated_at: new Date().toISOString() })
    .eq("challenge_id", challengeId);
  if (error) throw error;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token: rawToken } = await context.params;
    const token = sanitizeToken(rawToken);
    if (!token) return NextResponse.json({ ok: false, error: "Geçerli challenge bulunamadı." }, { status: 400 });

    const body = (await request.json()) as AnswerBody;
    const field = body.field;
    const rawValue = body.value;
    if (!isAllowedField(field)) return NextResponse.json({ ok: false, error: "Kontrol edilecek alan geçersiz." }, { status: 400 });
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
      return NextResponse.json({ ok: false, error: "Cevap boş olamaz." }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const cookieStore = await cookies();
    const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value ?? null;

    const { data: challengeData, error: challengeError } = await supabaseAdmin
      .from("guest_challenges")
      .select("id, invite_token, game_code, status, challenger_user_id, challenger_guest_id, opponent_user_id, opponent_guest_id")
      .eq("invite_token", token)
      .maybeSingle();
    if (challengeError || !challengeData) {
      return NextResponse.json({ ok: false, error: "Challenge bulunamadı." }, { status: challengeError ? 500 : 404 });
    }

    const challenge = challengeData as ChallengeRow;
    if (challenge.game_code !== "player_quiz") return NextResponse.json({ ok: false, error: "Bu challenge Player Quiz değil." }, { status: 400 });
    if (challenge.status !== "playing") return NextResponse.json({ ok: false, error: "Düello şu anda oynanabilir durumda değil." }, { status: 409 });

    const isChallenger = user ? challenge.challenger_user_id === user.id : Boolean(guestId && challenge.challenger_guest_id === guestId);
    const isOpponent = user ? challenge.opponent_user_id === user.id : Boolean(guestId && challenge.opponent_guest_id === guestId);
    if (!isChallenger && !isOpponent) return NextResponse.json({ ok: false, error: "Bu challenge'a cevap veremezsin." }, { status: 403 });
    const role: Role = isChallenger ? "challenger" : "opponent";

    const { data: gameData, error: gameError } = await supabaseAdmin
      .from("guest_challenge_player_quiz")
      .select(`
        challenge_id, player_id,
        challenger_birth_year_correct, opponent_birth_year_correct,
        challenger_nationality_correct, opponent_nationality_correct,
        challenger_solved_club_ids, opponent_solved_club_ids,
        challenger_attempt_count, opponent_attempt_count,
        challenger_finalized, opponent_finalized,
        challenger_forfeited, opponent_forfeited
      `)
      .eq("challenge_id", challenge.id)
      .maybeSingle();
    if (gameError || !gameData) return NextResponse.json({ ok: false, error: "Challenge oyunu hazırlanmadı." }, { status: 409 });

    const game = gameData as GameRow;
    const playerId = Number(game.player_id);
    const state = roleState(game, role);
    if (state.forfeited) return NextResponse.json({ ok: false, error: "Bu düellodan pes ettin." }, { status: 409 });
    if (state.finalized) return NextResponse.json({ ok: false, error: "Bu Player Quiz senin için tamamlandı." }, { status: 409 });

    const { data: rawClubs, error: clubsError } = await supabaseAdmin
      .from("player_quiz_clubs")
      .select("id, club_name, career_order")
      .eq("player_id", playerId)
      .order("career_order", { ascending: true });
    if (clubsError) return NextResponse.json({ ok: false, error: "Kariyer bilgileri okunamadı." }, { status: 500 });

    const seniorCareer = buildPlayerQuizSeniorCareer((rawClubs ?? []) as RawPlayerQuizClub[]);
    if (!seniorCareer.length) return NextResponse.json({ ok: false, error: "Oyuncunun kariyer kulüpleri hazırlanamadı." }, { status: 422 });
    const totalCount = seniorCareer.length + 2;

    if (field === "birthYear") {
      if (state.birthYearCorrect) {
        return NextResponse.json({
          ok: true,
          role,
          field,
          correct: true,
          alreadySolved: true,
          progress: progressPayload(true, state.nationalityCorrect, state.solvedClubIds, totalCount, state.attemptCount),
        });
      }

      const guessedBirthYear = Number(rawValue);
      if (!Number.isInteger(guessedBirthYear) || guessedBirthYear < 1900 || guessedBirthYear > 2100) {
        return NextResponse.json({ ok: false, error: "Geçerli bir doğum yılı gir." }, { status: 400 });
      }

      const { data: details, error: detailsError } = await supabaseAdmin
        .from("player_quiz_details")
        .select("birth_year")
        .eq("player_id", playerId)
        .maybeSingle();
      if (detailsError || !details) return NextResponse.json({ ok: false, error: "Doğum yılı kontrol edilemedi." }, { status: 500 });

      const correct = Number(details.birth_year) === guessedBirthYear;
      const attemptCount = state.attemptCount + 1;
      await updateRoleState(challenge.id, role, {
        birth_year_correct: correct ? true : state.birthYearCorrect,
        attempt_count: attemptCount,
      });
      const updated = correct || state.birthYearCorrect;

      return NextResponse.json({
        ok: true,
        role,
        field,
        correct,
        alreadySolved: false,
        progress: progressPayload(updated, state.nationalityCorrect, state.solvedClubIds, totalCount, attemptCount),
      });
    }

    if (field === "nationality") {
      if (state.nationalityCorrect) {
        return NextResponse.json({
          ok: true,
          role,
          field,
          correct: true,
          alreadySolved: true,
          progress: progressPayload(state.birthYearCorrect, true, state.solvedClubIds, totalCount, state.attemptCount),
        });
      }

      const { data: player, error: playerError } = await supabaseAdmin
        .from("guess_players")
        .select("nationality")
        .eq("player_id", playerId)
        .maybeSingle();
      if (playerError || !player?.nationality) return NextResponse.json({ ok: false, error: "Milliyet kontrol edilemedi." }, { status: 500 });

      // TR: Almanya ↔ Germany, Türkiye ↔ Turkey vb. EN cevaplar da aynı canonical eşleştirmeden geçer.
      const correct = nationalitiesAreEquivalent(player.nationality, String(rawValue));
      const attemptCount = state.attemptCount + 1;
      await updateRoleState(challenge.id, role, {
        nationality_correct: correct ? true : state.nationalityCorrect,
        attempt_count: attemptCount,
      });
      const updated = correct || state.nationalityCorrect;

      return NextResponse.json({
        ok: true,
        role,
        field,
        correct,
        alreadySolved: false,
        progress: progressPayload(state.birthYearCorrect, updated, state.solvedClubIds, totalCount, attemptCount),
      });
    }

    const normalizedGuess = normalizeText(rawValue);
    const matchedClub = seniorCareer.find((club) => normalizeText(club.name) === normalizedGuess);
    if (!matchedClub) {
      const attemptCount = state.attemptCount + 1;
      await updateRoleState(challenge.id, role, { attempt_count: attemptCount });
      return NextResponse.json({
        ok: true,
        role,
        field,
        correct: false,
        duplicate: false,
        matchedClub: null,
        progress: progressPayload(state.birthYearCorrect, state.nationalityCorrect, state.solvedClubIds, totalCount, attemptCount),
      });
    }

    const matchedId = Number(matchedClub.id);
    if (state.solvedClubIds.includes(matchedId)) {
      return NextResponse.json({
        ok: true,
        role,
        field,
        correct: true,
        duplicate: true,
        alreadySolved: true,
        matchedClub: { id: matchedId, name: matchedClub.name, careerOrder: matchedClub.careerOrder },
        progress: progressPayload(state.birthYearCorrect, state.nationalityCorrect, state.solvedClubIds, totalCount, state.attemptCount),
      });
    }

    const solvedClubIds = Array.from(new Set([...state.solvedClubIds, matchedId]));
    const attemptCount = state.attemptCount + 1;
    await updateRoleState(challenge.id, role, {
      solved_club_ids: solvedClubIds,
      attempt_count: attemptCount,
    });

    return NextResponse.json({
      ok: true,
      role,
      field,
      correct: true,
      duplicate: false,
      alreadySolved: false,
      matchedClub: { id: matchedId, name: matchedClub.name, careerOrder: matchedClub.careerOrder },
      progress: progressPayload(state.birthYearCorrect, state.nationalityCorrect, solvedClubIds, totalCount, attemptCount),
    });
  } catch (error) {
    console.error("Player Quiz VS answer endpoint hatası:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Cevap kontrol edilirken hata oluştu." },
      { status: 500 },
    );
  }
}
