import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

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

type ClubRow = {
  player_id: number;
  club_name: string;
};

type TeamTier =
  | "S"
  | "A"
  | "B";

type TeamRow = {
  name: string;
  duel_tier: TeamTier;
  duel_score: number;
};

type PairCandidate = {
  clubA: string;
  clubB: string;

  tierA: TeamTier;
  tierB: TeamTier;

  scoreA: number;
  scoreB: number;

  sharedCount: number;
};

type RoundRule = {
  roundNo: number;

  leftTiers: TeamTier[];

  rightTiers: TeamTier[];

  preferredMinSharedPlayers: number;
};

/* =========================================================
   SETTINGS
========================================================= */

const GUEST_COOKIE_NAME =
  "footbattle_guest";

const ROUND_COUNT =
  5;

const CLUB_ROWS_PAGE_SIZE =
  1000;

const ROUND_TIER_RULES: RoundRule[] =
  [
    {
      roundNo: 1,
      leftTiers: ["S"],
      rightTiers: ["A", "B"],
      preferredMinSharedPlayers: 5,
    },

    {
      roundNo: 2,
      leftTiers: ["S", "A"],
      rightTiers: ["A", "B"],
      preferredMinSharedPlayers: 4,
    },

    {
      roundNo: 3,
      leftTiers: ["S", "A"],
      rightTiers: ["A", "B"],
      preferredMinSharedPlayers: 3,
    },

    {
      roundNo: 4,
      leftTiers: ["S"],
      rightTiers: ["A"],
      preferredMinSharedPlayers: 2,
    },

    {
      roundNo: 5,
      leftTiers: ["S", "A"],
      rightTiers: ["A", "B"],
      preferredMinSharedPlayers: 3,
    },
  ];

/* =========================================================
   HELPERS
========================================================= */

function sanitizeToken(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .replace(
      /[^a-zA-Z0-9]/g,
      "",
    )
    .slice(
      0,
      64,
    );
}

function shuffleArray<T>(
  values: T[],
) {
  const result =
    [...values];

  for (
    let i =
      result.length -
      1;
    i >
    0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1),
      );

    [
      result[i],
      result[j],
    ] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

function makePairKey(
  clubA: string,
  clubB: string,
) {
  return [
    clubA,
    clubB,
  ]
    .sort(
      (
        a,
        b,
      ) =>
        a.localeCompare(
          b,
          "tr",
        ),
    )
    .join(
      "|||",
    );
}

function pairMatchesRule(
  pair: PairCandidate,
  rule: RoundRule,
) {
  const direct =
    rule.leftTiers.includes(
      pair.tierA,
    ) &&
    rule.rightTiers.includes(
      pair.tierB,
    );

  const reverse =
    rule.leftTiers.includes(
      pair.tierB,
    ) &&
    rule.rightTiers.includes(
      pair.tierA,
    );

  return (
    direct ||
    reverse
  );
}

function buildRoundPool(
  allPairs: PairCandidate[],
  rule: RoundRule,
  usedPairKeys: Set<string>,
  usedClubs: Set<string>,
) {
  const baseMatches =
    allPairs.filter(
      (pair) =>
        pairMatchesRule(
          pair,
          rule,
        ) &&
        !usedPairKeys.has(
          makePairKey(
            pair.clubA,
            pair.clubB,
          ),
        ),
    );

  const unusedClubMatches =
    baseMatches.filter(
      (pair) =>
        !usedClubs.has(
          pair.clubA,
        ) &&
        !usedClubs.has(
          pair.clubB,
        ),
    );

  const basePool =
    unusedClubMatches.length >
    0
      ? unusedClubMatches
      : baseMatches;

  for (
    let minShared =
      rule.preferredMinSharedPlayers;
    minShared >=
    1;
    minShared -=
      1
  ) {
    const pool =
      basePool.filter(
        (pair) =>
          pair.sharedCount >=
          minShared,
      );

    if (
      pool.length >
      0
    ) {
      return {
        pool,
        actualMinShared:
          minShared,
      };
    }
  }

  return {
    pool: [],
    actualMinShared: 0,
  };
}

/* =========================================================
   LOAD CLUB DATA
========================================================= */

async function loadAllClubRows() {
  let from =
    0;

  const allRows:
    ClubRow[] =
    [];

  while (true) {
    const to =
      from +
      CLUB_ROWS_PAGE_SIZE -
      1;

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "player_quiz_clubs",
        )
        .select(`
          player_id,
          club_name
        `)
        .not(
          "club_name",
          "is",
          null,
        )
        .order(
          "player_id",
          {
            ascending:
              true,
          },
        )
        .order(
          "club_name",
          {
            ascending:
              true,
          },
        )
        .range(
          from,
          to,
        );

    if (error) {
      throw error;
    }

    const rows =
      (data ??
        []) as ClubRow[];

    allRows.push(
      ...rows,
    );

    if (
      rows.length <
      CLUB_ROWS_PAGE_SIZE
    ) {
      break;
    }

    from +=
      CLUB_ROWS_PAGE_SIZE;

    if (
      from >
      500_000
    ) {
      throw new Error(
        "Kulüp kariyer verisi güvenlik sınırını aştı.",
      );
    }
  }

  return allRows;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       TOKEN
    ===================================================== */

    const {
      token: rawToken,
    } =
      await context.params;

    const token =
      sanitizeToken(
        rawToken,
      );

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli challenge bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       AUTH / GUEST
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authSupabase.auth.getUser();

    const cookieStore =
      await cookies();

    const guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ??
      null;

    /* =====================================================
       CHALLENGE
    ===================================================== */

    const {
      data:
        challengeData,

      error:
        challengeError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
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
        .eq(
          "invite_token",
          token,
        )
        .maybeSingle();

    if (
      challengeError ||
      !challengeData
    ) {
      console.error(
        "Club Clash challenge sorgu hatası:",
        challengeError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge bulunamadı.",
        },
        {
          status:
            challengeError
              ? 500
              : 404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    /* =====================================================
       ACCESS
    ===================================================== */

    const isChallenger =
      user
        ? challenge
            .challenger_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .challenger_guest_id ===
                guestId,
          );

    const isOpponent =
      user
        ? challenge
            .opponent_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .opponent_guest_id ===
                guestId,
          );

    if (
      !isChallenger &&
      !isOpponent
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge'a erişim yetkin yok.",
        },
        {
          status: 403,
        },
      );
    }

    const role:
      | "challenger"
      | "opponent" =
      isChallenger
        ? "challenger"
        : "opponent";

    /* =====================================================
       GAME CODE
    ===================================================== */

    if (
      challenge.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge 2 Takım 1 Oyuncu değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       STATUS
    ===================================================== */

    if (
      challenge.status !==
        "ready" &&
      challenge.status !==
        "playing"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "2 Takım 1 Oyuncu şu anda hazırlanamaz.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       EXISTING ROUNDS
    ===================================================== */

    const {
      data:
        existingRounds,

      error:
        existingRoundsError,
    } =
      await supabaseAdmin
        .from(
          "challenge_rounds",
        )
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
        .eq(
          "challenge_id",
          challenge.id,
        )
        .eq(
          "game_code",
          "club_clash",
        )
        .order(
          "round_no",
          {
            ascending:
              true,
          },
        );

    if (
      existingRoundsError
    ) {
      console.error(
        "Challenge round sorgu hatası:",
        existingRoundsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Round bilgileri kontrol edilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      existingRounds &&
      existingRounds.length >
      0
    ) {
      return NextResponse.json({
        ok: true,

        role,

        alreadyPrepared:
          true,

        roundCount:
          existingRounds.length,

        rounds:
          existingRounds.map(
            (round) => ({
              id:
                Number(
                  round.id,
                ),

              roundNo:
                round.round_no,

              left: {
                type:
                  round.left_type,

                value:
                  round.left_value,
              },

              right: {
                type:
                  round.right_type,

                value:
                  round.right_value,
              },

              winnerSide:
                round.winner_side,

              completedAt:
                round.completed_at,
            }),
          ),
      });
    }

    /* =====================================================
       TEAMS
    ===================================================== */

    const {
      data:
        teamData,

      error:
        teamError,
    } =
      await supabaseAdmin
        .from(
          "football_teams",
        )
        .select(`
          name,
          duel_tier,
          duel_score
        `)
        .eq(
          "duel_enabled",
          true,
        )
        .in(
          "duel_tier",
          [
            "S",
            "A",
            "B",
          ],
        );

    if (
      teamError
    ) {
      console.error(
        "football_teams sorgu hatası:",
        teamError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello takım havuzu okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const teams =
      (
        teamData ??
        []
      ).filter(
        (
          row,
        ): row is TeamRow =>
          Boolean(
            row.name,
          ) &&
          (
            row.duel_tier ===
              "S" ||
            row.duel_tier ===
              "A" ||
            row.duel_tier ===
              "B"
          ),
      );

    if (
      teams.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello için aktif takım bulunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const teamMap =
      new Map<
        string,
        TeamRow
      >();

    for (
      const team
      of teams
    ) {
      teamMap.set(
        team.name,
        team,
      );
    }

    /* =====================================================
       CLUB DATA
    ===================================================== */

    let rawClubRows:
      ClubRow[];

    try {
      rawClubRows =
        await loadAllClubRows();
    } catch (error) {
      console.error(
        "Club Clash kariyer verisi okunamadı:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kulüp kariyer verileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const clubRows =
      rawClubRows
        .map(
          (row) => ({
            player_id:
              Number(
                row.player_id,
              ),

            club_name:
              row.club_name
                ?.trim(),
          }),
        )
        .filter(
          (
            row,
          ): row is {
            player_id: number;
            club_name: string;
          } =>
            Number.isInteger(
              row.player_id,
            ) &&
            row.player_id >
              0 &&
            Boolean(
              row.club_name,
            ),
        )
        .filter(
          (row) =>
            teamMap.has(
              row.club_name,
            ),
        );

    /* =====================================================
       PLAYER -> CLUBS
    ===================================================== */

    const playerClubs =
      new Map<
        number,
        Set<string>
      >();

    for (
      const row
      of clubRows
    ) {
      let clubs =
        playerClubs.get(
          row.player_id,
        );

      if (!clubs) {
        clubs =
          new Set<string>();

        playerClubs.set(
          row.player_id,
          clubs,
        );
      }

      clubs.add(
        row.club_name,
      );
    }

    /* =====================================================
       BUILD PAIRS
    ===================================================== */

    const pairCounts =
      new Map<
        string,
        PairCandidate
      >();

    for (
      const clubsSet
      of playerClubs.values()
    ) {
      const clubs =
        Array.from(
          clubsSet,
        );

      if (
        clubs.length <
        2
      ) {
        continue;
      }

      for (
        let i =
          0;
        i <
        clubs.length -
          1;
        i +=
          1
      ) {
        for (
          let j =
            i + 1;
          j <
          clubs.length;
          j +=
            1
        ) {
          const first =
            clubs[i];

          const second =
            clubs[j];

          if (
            !first ||
            !second ||
            first ===
              second
          ) {
            continue;
          }

          const teamA =
            teamMap.get(
              first,
            );

          const teamB =
            teamMap.get(
              second,
            );

          if (
            !teamA ||
            !teamB
          ) {
            continue;
          }

          const key =
            makePairKey(
              first,
              second,
            );

          const existing =
            pairCounts.get(
              key,
            );

          if (
            existing
          ) {
            existing.sharedCount +=
              1;

            continue;
          }

          const sorted =
            [
              teamA,
              teamB,
            ].sort(
              (
                a,
                b,
              ) =>
                a.name.localeCompare(
                  b.name,
                  "tr",
                ),
            );

          pairCounts.set(
            key,
            {
              clubA:
                sorted[0]
                  .name,

              clubB:
                sorted[1]
                  .name,

              tierA:
                sorted[0]
                  .duel_tier,

              tierB:
                sorted[1]
                  .duel_tier,

              scoreA:
                sorted[0]
                  .duel_score,

              scoreB:
                sorted[1]
                  .duel_score,

              sharedCount:
                1,
            },
          );
        }
      }
    }

    const validPairs =
      Array.from(
        pairCounts.values(),
      ).filter(
        (pair) =>
          pair.sharedCount >=
          1,
      );

    if (
      validPairs.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ortak oyuncusu bulunan takım eşleşmesi bulunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       SELECT 5 ROUNDS
    ===================================================== */

    const selectedPairs:
      PairCandidate[] =
      [];

    const usedPairKeys =
      new Set<string>();

    const usedClubs =
      new Set<string>();

    for (
      const rule
      of ROUND_TIER_RULES
    ) {
      const {
        pool,
      } =
        buildRoundPool(
          validPairs,
          rule,
          usedPairKeys,
          usedClubs,
        );

      if (
        pool.length ===
        0
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              `Round ${rule.roundNo} için uygun takım eşleşmesi bulunamadı.`,
          },
          {
            status: 500,
          },
        );
      }

      const selected =
        shuffleArray(
          pool,
        )[0];

      if (
        !selected
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              `Round ${rule.roundNo} için takım seçilemedi.`,
          },
          {
            status: 500,
          },
        );
      }

      selectedPairs.push(
        selected,
      );

      usedPairKeys.add(
        makePairKey(
          selected.clubA,
          selected.clubB,
        ),
      );

      usedClubs.add(
        selected.clubA,
      );

      usedClubs.add(
        selected.clubB,
      );
    }

    if (
      selectedPairs.length !==
      ROUND_COUNT
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "5 round hazırlanamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       INSERT CHALLENGE ROUNDS
    ===================================================== */

    const rowsToInsert =
      selectedPairs.map(
        (
          pair,
          index,
        ) => ({
          challenge_id:
            challenge.id,

          round_no:
            index +
            1,

          game_code:
            "club_clash",

          left_type:
            "club",

          left_value:
            pair.clubA,

          right_type:
            "club",

          right_value:
            pair.clubB,
        }),
      );

    const {
      data:
        insertedRounds,

      error:
        insertError,
    } =
      await supabaseAdmin
        .from(
          "challenge_rounds",
        )
        .insert(
          rowsToInsert,
        )
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
        .order(
          "round_no",
          {
            ascending:
              true,
          },
        );

    /* =====================================================
       RACE CONDITION
    ===================================================== */

    if (
      insertError
    ) {
      if (
        insertError.code ===
        "23505"
      ) {
        const {
          data:
            roundsAfterConflict,

          error:
            readError,
        } =
          await supabaseAdmin
            .from(
              "challenge_rounds",
            )
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

              completed_at,
              created_at
            `)
            .eq(
              "challenge_id",
              challenge.id,
            )
            .eq(
              "game_code",
              "club_clash",
            )
            .order(
              "round_no",
              {
                ascending:
                  true,
              },
            );

        if (
          readError
        ) {
          console.error(
            "Conflict sonrası round okuma hatası:",
            readError,
          );

          return NextResponse.json(
            {
              ok: false,
              error:
                "Roundlar hazırlanamadı.",
            },
            {
              status: 500,
            },
          );
        }

        return NextResponse.json({
          ok: true,

          role,

          alreadyPrepared:
            true,

          roundCount:
            roundsAfterConflict
              ?.length ??
            0,

          rounds:
            (
              roundsAfterConflict ??
              []
            ).map(
              (round) => ({
                id:
                  Number(
                    round.id,
                  ),

                roundNo:
                  round.round_no,

                left: {
                  type:
                    round.left_type,

                  value:
                    round.left_value,
                },

                right: {
                  type:
                    round.right_type,

                  value:
                    round.right_value,
                },

                winnerSide:
                  round.winner_side,

                completedAt:
                  round.completed_at,
              }),
            ),
        });
      }

      console.error(
        "Challenge Club Clash round insert hatası:",
        insertError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "2 Takım 1 Oyuncu roundları oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      role,

      alreadyPrepared:
        false,

      game: {
        code:
          "club_clash",

        label:
          "2 Takım 1 Oyuncu",

        roundCount:
          ROUND_COUNT,

        winScore:
          3,
      },

      roundCount:
        insertedRounds
          ?.length ??
        0,

      rounds:
        (
          insertedRounds ??
          []
        ).map(
          (round) => ({
            id:
              Number(
                round.id,
              ),

            roundNo:
              round.round_no,

            left: {
              type:
                round.left_type,

              value:
                round.left_value,
            },

            right: {
              type:
                round.right_type,

              value:
                round.right_value,
            },

            winnerSide:
              round.winner_side,

            completedAt:
              round.completed_at,
          }),
        ),
    });
  } catch (error) {
    console.error(
      "Guest Club Clash prepare endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "2 Takım 1 Oyuncu hazırlanamadı.",
      },
      {
        status: 500,
      },
    );
  }
}