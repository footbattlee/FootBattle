import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME =
  "footbattle_guest";

const ROUND_COUNT = 5;
const PLAYER_SAMPLE_SIZE = 180;
const MAX_PLAYER_SEARCH_ROUNDS = 10;

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

type ChallengeRow = {
  id: number;
  invite_token: string;
  game_code: string;
  status: string;
  challenger_user_id: string | null;
  challenger_guest_id: string | null;
  opponent_user_id: string | null;
  opponent_guest_id: string | null;
};

type PlayerRow = {
  player_id: number;
  name: string;
  nationality: string | null;
};

type ClubRow = {
  player_id: number;
  club_name: string;
};

type TeamRow = {
  name: string;
  country: string | null;
  duel_tier: string | null;
  duel_score: number | null;
};

type Question = {
  clubName: string;
  nationality: string;
  playerId: number;
};

function sanitizeToken(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 64);
}

function shuffleArray<T>(
  values: T[],
) {
  const result = [...values];

  for (
    let index = result.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (index + 1),
      );

    [
      result[index],
      result[randomIndex],
    ] = [
      result[randomIndex],
      result[index],
    ];
  }

  return result;
}

function normalizeCountry(
  value: string,
) {
  const normalized =
    value
      .trim()
      .toLocaleLowerCase("en-US")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const aliases: Record<string, string> = {
    turkiye: "turkey",
    turkey: "turkey",
    usa: "unitedstates",
    unitedstatesofamerica: "unitedstates",
    unitedstates: "unitedstates",
    uae: "unitedarabemirates",
    unitedarabemirates: "unitedarabemirates",
    southkorea: "korearepublic",
    korearepublic: "korearepublic",
    korea: "korearepublic",
    ivorycoast: "cotedivoire",
    cotedivoire: "cotedivoire",
    czechrepublic: "czechia",
    czechia: "czechia",
  };

  return aliases[normalized] ?? normalized;
}

async function buildQuestionPool() {
  const {
    data: teamData,
    error: teamError,
  } =
    await supabaseAdmin
      .from("football_teams")
      .select(`
        name,
        country,
        duel_tier,
        duel_score
      `)
      .eq("duel_enabled", true)
      .in("duel_tier", [
        "S",
        "A",
        "B",
      ]);

  if (teamError) {
    throw teamError;
  }

  const allowedTeams =
    new Map<string, TeamRow>();

  for (
    const team of
      (teamData ?? []) as TeamRow[]
  ) {
    const name = team.name?.trim();
    const country = team.country?.trim();

    if (!name || !country) {
      continue;
    }

    allowedTeams.set(name, team);
  }

  if (allowedTeams.size === 0) {
    throw new Error(
      "Düello için uygun takım bulunamadı.",
    );
  }

  const {
    count: playerCount,
    error: countError,
  } =
    await supabaseAdmin
      .from("guess_players")
      .select("player_id", {
        count: "exact",
        head: true,
      })
      .not("nationality", "is", null);

  if (countError) {
    throw countError;
  }

  const totalPlayers =
    playerCount ?? 0;

  const pool: Question[] = [];
  const seen = new Set<string>();

  for (
    let round = 0;
    round < MAX_PLAYER_SEARCH_ROUNDS &&
    pool.length < 60;
    round += 1
  ) {
    const maxOffset =
      Math.max(
        0,
        totalPlayers - PLAYER_SAMPLE_SIZE,
      );

    const offset =
      maxOffset > 0
        ? Math.floor(
            Math.random() *
              (maxOffset + 1),
          )
        : 0;

    const {
      data: playerData,
      error: playerError,
    } =
      await supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          nationality
        `)
        .not("nationality", "is", null)
        .order("player_id", {
          ascending: true,
        })
        .range(
          offset,
          offset + PLAYER_SAMPLE_SIZE - 1,
        );

    if (playerError) {
      throw playerError;
    }

    const players =
      shuffleArray(
        (playerData ?? []) as PlayerRow[],
      ).filter(
        (player) =>
          Boolean(
            player.nationality?.trim(),
          ),
      );

    if (players.length === 0) {
      continue;
    }

    const playerIds =
      players.map(
        (player) =>
          Number(player.player_id),
      );

    const {
      data: clubData,
      error: clubError,
    } =
      await supabaseAdmin
        .from("player_quiz_clubs")
        .select(`
          player_id,
          club_name
        `)
        .in("player_id", playerIds)
        .not("club_name", "is", null);

    if (clubError) {
      throw clubError;
    }

    const clubsByPlayer =
      new Map<number, string[]>();

    for (
      const row of
        (clubData ?? []) as ClubRow[]
    ) {
      const playerId =
        Number(row.player_id);
      const clubName =
        row.club_name?.trim();

      if (
        !Number.isInteger(playerId) ||
        !clubName ||
        !allowedTeams.has(clubName)
      ) {
        continue;
      }

      const current =
        clubsByPlayer.get(playerId) ?? [];

      current.push(clubName);
      clubsByPlayer.set(
        playerId,
        current,
      );
    }

    for (const player of players) {
      const nationality =
        player.nationality?.trim();

      if (!nationality) {
        continue;
      }

      const clubs =
        shuffleArray(
          clubsByPlayer.get(
            Number(player.player_id),
          ) ?? [],
        );

      for (const clubName of clubs) {
        const team =
          allowedTeams.get(clubName);

        if (!team?.country) {
          continue;
        }

        if (
          normalizeCountry(team.country) ===
          normalizeCountry(nationality)
        ) {
          continue;
        }

        const key =
          `${clubName.toLocaleLowerCase("tr-TR")}::${nationality.toLocaleLowerCase("tr-TR")}`;

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        pool.push({
          clubName,
          nationality,
          playerId:
            Number(player.player_id),
        });
      }
    }
  }

  return shuffleArray(pool);
}

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { token: rawToken } =
      await context.params;

    const token =
      sanitizeToken(rawToken);

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli challenge bulunamadı.",
        },
        { status: 400 },
      );
    }

    const authClient =
      await createAuthServerClient();

    const {
      data: { user },
    } =
      await authClient.auth.getUser();

    const cookieStore =
      await cookies();

    const guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ?? null;

    const {
      data: challengeData,
      error: challengeError,
    } =
      await supabaseAdmin
        .from("guest_challenges")
        .select(`
          id,
          invite_token,
          game_code,
          status,
          challenger_user_id,
          challenger_guest_id,
          opponent_user_id,
          opponent_guest_id
        `)
        .eq("invite_token", token)
        .maybeSingle();

    if (challengeError) {
      throw challengeError;
    }

    if (!challengeData) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge bulunamadı.",
        },
        { status: 404 },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    const isChallenger =
      user
        ? challenge.challenger_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge.challenger_guest_id ===
                guestId,
          );

    const isOpponent =
      user
        ? challenge.opponent_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge.opponent_guest_id ===
                guestId,
          );

    if (!isChallenger && !isOpponent) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge'a erişim yetkin yok.",
        },
        { status: 403 },
      );
    }

    if (
      challenge.game_code !==
      "club_nation"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge 1 Takım 1 Millet değil.",
        },
        { status: 409 },
      );
    }

    if (
      challenge.status !== "playing"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello henüz başlamadı.",
        },
        { status: 409 },
      );
    }

    const {
      data: existingRounds,
      error: existingError,
    } =
      await supabaseAdmin
        .from("challenge_rounds")
        .select(`
          id,
          round_no,
          left_type,
          left_value,
          right_type,
          right_value,
          winner_side,
          completed_at
        `)
        .eq("challenge_id", challenge.id)
        .eq("game_code", "club_nation")
        .order("round_no", {
          ascending: true,
        });

    if (existingError) {
      throw existingError;
    }

    if (
      existingRounds &&
      existingRounds.length > 0
    ) {
      return NextResponse.json({
        ok: true,
        alreadyPrepared: true,
        role:
          isChallenger
            ? "challenger"
            : "opponent",
        roundCount:
          existingRounds.length,
        rounds:
          existingRounds,
      });
    }

    const pool =
      await buildQuestionPool();

    const selected: Question[] = [];
    const usedClubs = new Set<string>();
    const usedNationalities =
      new Set<string>();

    for (const item of pool) {
      if (
        usedClubs.has(item.clubName) &&
        usedNationalities.has(
          item.nationality,
        )
      ) {
        continue;
      }

      selected.push(item);
      usedClubs.add(item.clubName);
      usedNationalities.add(
        item.nationality,
      );

      if (
        selected.length === ROUND_COUNT
      ) {
        break;
      }
    }

    if (
      selected.length < ROUND_COUNT
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "5 uygun round hazırlanamadı.",
        },
        { status: 500 },
      );
    }

    const rowsToInsert =
      selected.map(
        (question, index) => ({
          challenge_id:
            challenge.id,
          round_no:
            index + 1,
          game_code:
            "club_nation",
          left_type:
            "club",
          left_value:
            question.clubName,
          right_type:
            "nationality",
          right_value:
            question.nationality,
        }),
      );

    const {
      data: insertedRounds,
      error: insertError,
    } =
      await supabaseAdmin
        .from("challenge_rounds")
        .insert(rowsToInsert)
        .select(`
          id,
          challenge_id,
          round_no,
          game_code,
          left_type,
          left_value,
          right_type,
          right_value,
          winner_side,
          challenger_answer,
          opponent_answer,
          challenger_answer_player_id,
          opponent_answer_player_id,
          challenger_answered_at,
          opponent_answered_at,
          completed_at,
          created_at
        `)
        .order("round_no", {
          ascending: true,
        });

    if (insertError) {
      if (insertError.code === "23505") {
        const {
          data: roundsAfterConflict,
          error: readError,
        } =
          await supabaseAdmin
            .from("challenge_rounds")
            .select(`
              id,
              round_no,
              left_type,
              left_value,
              right_type,
              right_value,
              winner_side,
              completed_at
            `)
            .eq(
              "challenge_id",
              challenge.id,
            )
            .eq(
              "game_code",
              "club_nation",
            )
            .order("round_no", {
              ascending: true,
            });

        if (readError) {
          throw readError;
        }

        return NextResponse.json({
          ok: true,
          alreadyPrepared: true,
          role:
            isChallenger
              ? "challenger"
              : "opponent",
          roundCount:
            roundsAfterConflict?.length ?? 0,
          rounds:
            roundsAfterConflict ?? [],
        });
      }

      throw insertError;
    }

    return NextResponse.json({
      ok: true,
      alreadyPrepared: false,
      role:
        isChallenger
          ? "challenger"
          : "opponent",
      roundCount:
        insertedRounds?.length ?? 0,
      rounds:
        insertedRounds ?? [],
    });
  } catch (error) {
    console.error(
      "Club Nation prepare endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Düello roundları hazırlanamadı.",
      },
      { status: 500 },
    );
  }
}