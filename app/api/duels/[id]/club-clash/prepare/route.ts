import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DuelRow = {
  id: number;
  challenger_id: string;
  opponent_id: string;
  game_code: string;
  status: string;
};

type ClubRow = {
  player_id: number;
  club_name: string;
};

type TeamTier = "S" | "A" | "B";

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

  /*
   * Bu round için hedeflenen minimum
   * ortak oyuncu sayısı.
   */
  preferredMinSharedPlayers: number;
};

/* =========================================================
   SETTINGS
========================================================= */

const ROUND_COUNT = 5;

const CLUB_ROWS_PAGE_SIZE = 1000;

/*
 * Round kuralları
 *
 * R1 → S + A/B
 * R2 → S/A + A/B
 * R3 → S/A + A/B
 * R4 → A + A
 * R5 → A + A/B
 *
 * Aynı zamanda round ilerledikçe
 * ortak oyuncu sayısı şartı gevşiyor.
 */
const ROUND_TIER_RULES: RoundRule[] = [
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
    rightTiers: ["A", "A"],
    preferredMinSharedPlayers: 3,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function shuffleArray<T>(
  values: T[],
) {
  const result =
    [...values];

  for (
    let i =
      result.length - 1;
    i > 0;
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
  return [clubA, clubB]
    .sort(
      (a, b) =>
        a.localeCompare(
          b,
          "tr",
        ),
    )
    .join("|||");
}

/* =========================================================
   TÜM PLAYER CLUB SATIRLARINI SAYFALI ÇEK
========================================================= */

async function loadAllClubRows() {
  let from = 0;

  const allRows: ClubRow[] =
    [];

  while (true) {
    const to =
      from +
      CLUB_ROWS_PAGE_SIZE -
      1;

    const {
      data,
      error,
    } = await supabaseAdmin
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
          ascending: true,
        },
      )
      .order(
        "club_name",
        {
          ascending: true,
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
        "Kulüp kariyer verisi beklenenden fazla. Pagination güvenlik sınırı aşıldı.",
      );
    }
  }

  return allRows;
}

/* =========================================================
   ROUND RULE MATCHER
========================================================= */

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

/* =========================================================
   ROUND İÇİN UYGUN HAVUZU BUL
========================================================= */

function buildRoundPool(
  allPairs: PairCandidate[],
  rule: RoundRule,
  usedPairKeys: Set<string>,
  usedClubs: Set<string>,
) {
  /*
   * Önce tier kuralına uyan ve
   * daha önce kullanılmamış pairleri al.
   */
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

  /*
   * Önce aynı takımın tekrar etmediği
   * pairleri tercih ediyoruz.
   */
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

  /*
   * Round için hedeflenen ortak oyuncu
   * şartını önce aynen deniyoruz.
   *
   * Örn R1:
   * 5 → 4 → 3 → 2 → 1
   *
   * Böylece eşleşme bulunamadığında
   * oyun tamamen hata vermiyor.
   */
  for (
    let minShared =
      rule.preferredMinSharedPlayers;
    minShared >= 1;
    minShared -= 1
  ) {
    const difficultyPool =
      basePool.filter(
        (pair) =>
          pair.sharedCount >=
          minShared,
      );

    if (
      difficultyPool.length >
      0
    ) {
      return {
        pool:
          difficultyPool,

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
   POST
========================================================= */

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       1. AUTH
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: { user },
      error: userError,
    } =
      await authSupabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Giriş yapmalısın.",
        },
        {
          status: 401,
        },
      );
    }

    const currentUserId =
      user.id;

    /* =====================================================
       2. DUEL ID
    ===================================================== */

    const {
      id,
    } =
      await context.params;

    const duelId =
      Number(id);

    if (
      !Number.isInteger(
        duelId,
      ) ||
      duelId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli düello seçilmedi.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       3. DUEL
    ===================================================== */

    const {
      data: duelData,
      error: duelError,
    } = await supabaseAdmin
      .from("duels")
      .select(`
        id,
        challenger_id,
        opponent_id,
        game_code,
        status
      `)
      .eq(
        "id",
        duelId,
      )
      .maybeSingle();

    if (duelError) {
      console.error(
        "Club Clash duel sorgu hatası:",
        duelError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (!duelData) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const duel =
      duelData as DuelRow;

    /* =====================================================
       4. AUTHORIZATION
    ===================================================== */

    const belongsToDuel =
      duel.challenger_id ===
        currentUserId ||
      duel.opponent_id ===
        currentUserId;

    if (!belongsToDuel) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düelloya erişim yetkin yok.",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       5. GAME CODE
    ===================================================== */

    if (
      duel.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düello 2 Takım 1 Oyuncu oyunu değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       6. STATUS
    ===================================================== */

    if (
      duel.status !==
        "accepted" &&
      duel.status !==
        "active"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "2 Takım 1 Oyuncu yalnızca kabul edilmiş veya aktif düellolarda hazırlanabilir.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       7. ALREADY PREPARED?
    ===================================================== */

    const {
      data: existingRounds,
      error:
        existingRoundsError,
    } = await supabaseAdmin
      .from(
        "duel_club_clash_rounds",
      )
      .select(`
        id,
        duel_id,
        round_no,
        club_a,
        club_b,
        winner_user_id,
        completed_at,
        created_at
      `)
      .eq(
        "duel_id",
        duelId,
      )
      .order(
        "round_no",
        {
          ascending: true,
        },
      );

    if (
      existingRoundsError
    ) {
      console.error(
        "Mevcut Club Clash round sorgu hatası:",
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

        alreadyPrepared:
          true,

        message:
          "2 Takım 1 Oyuncu roundları zaten hazırlanmış.",

        roundCount:
          existingRounds.length,

        rounds:
          existingRounds,
      });
    }

    /* =====================================================
       8. ACTIVE DUEL TEAMS
    ===================================================== */

    const {
      data: teamData,
      error: teamError,
    } = await supabaseAdmin
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

    if (teamError) {
      console.error(
        "Club Clash football_teams sorgu hatası:",
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
      teams.length === 0
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

    /* =====================================================
       9. TEAM MAP
    ===================================================== */

    const teamMap =
      new Map<
        string,
        TeamRow
      >();

    for (
      const team of teams
    ) {
      teamMap.set(
        team.name,
        team,
      );
    }

    /* =====================================================
       10. PLAYER CLUB DATA
    ===================================================== */

    let rawClubRows:
      ClubRow[] = [];

    try {
      rawClubRows =
        await loadAllClubRows();
    } catch (
      clubRowsError
    ) {
      console.error(
        "Club Clash kulüp verisi sorgu hatası:",
        clubRowsError,
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

    /* =====================================================
       11. SADECE ENABLED TAKIMLAR
    ===================================================== */

    const clubRows =
      rawClubRows
        .map(
          (
            row,
          ) => ({
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
            Number.isFinite(
              row.player_id,
            ) &&
            Boolean(
              row.club_name,
            ),
        )
        .filter(
          (
            row,
          ) =>
            teamMap.has(
              row.club_name,
            ),
        );

    if (
      clubRows.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Aktif düello takımları için kariyer verisi bulunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       12. PLAYER -> CLUBS
    ===================================================== */

    const playerClubs =
      new Map<
        number,
        Set<string>
      >();

    for (
      const row of clubRows
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
       13. BUILD PAIRS
    ===================================================== */

    const pairCounts =
      new Map<
        string,
        PairCandidate
      >();

    for (
      const clubsSet of
      playerClubs.values()
    ) {
      const clubs =
        Array.from(
          clubsSet,
        );

      if (
        clubs.length < 2
      ) {
        continue;
      }

      for (
        let i = 0;
        i <
        clubs.length - 1;
        i += 1
      ) {
        for (
          let j =
            i + 1;
          j <
          clubs.length;
          j += 1
        ) {
          const first =
            clubs[i];

          const second =
            clubs[j];

          if (
            !first ||
            !second ||
            first === second
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

          if (existing) {
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
      validPairs.length === 0
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
       14. ROUND SELECTION
    ===================================================== */

    const selectedPairs:
      PairCandidate[] =
      [];

    const usedPairKeys =
      new Set<string>();

    const usedClubs =
      new Set<string>();

    const roundDebug: Array<{
      roundNo: number;
      preferredMinSharedPlayers: number;
      actualMinSharedPlayers: number;
    }> = [];

    for (
      const rule of
      ROUND_TIER_RULES
    ) {
      const {
        pool,
        actualMinShared,
      } =
        buildRoundPool(
          validPairs,
          rule,
          usedPairKeys,
          usedClubs,
        );

      if (
        pool.length === 0
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              `Round ${rule.roundNo} için uygun takım eşleşmesi bulunamadı.`,

            debug: {
              rule,
              validPairCount:
                validPairs.length,
            },
          },
          {
            status: 500,
          },
        );
      }

      /*
       * Burada artık sharedCount'a göre
       * sıralayıp ilk 40'a sıkıştırmıyoruz.
       *
       * Zorluk kriterini zaten
       * buildRoundPool ile uyguladık.
       *
       * Böylece daha çeşitli pairler gelir.
       */
      const shuffled =
        shuffleArray(
          pool,
        );

      const selected =
        shuffled[0];

      if (!selected) {
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

      roundDebug.push({
        roundNo:
          rule.roundNo,

        preferredMinSharedPlayers:
          rule.preferredMinSharedPlayers,

        actualMinSharedPlayers:
          actualMinShared,
      });
    }

    /* =====================================================
       15. FINAL CHECK
    ===================================================== */

    if (
      selectedPairs.length !==
      ROUND_COUNT
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "5 round oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       16. INSERT PAYLOAD
    ===================================================== */

    const rowsToInsert =
      selectedPairs.map(
        (
          pair,
          index,
        ) => ({
          duel_id:
            duelId,

          round_no:
            index + 1,

          club_a:
            pair.clubA,

          club_b:
            pair.clubB,
        }),
      );

    /* =====================================================
       17. INSERT
    ===================================================== */

    const {
      data: insertedRounds,
      error: insertError,
    } = await supabaseAdmin
      .from(
        "duel_club_clash_rounds",
      )
      .insert(
        rowsToInsert,
      )
      .select(`
        id,
        duel_id,
        round_no,
        club_a,
        club_b,
        winner_user_id,
        completed_at,
        created_at
      `)
      .order(
        "round_no",
        {
          ascending: true,
        },
      );

    if (insertError) {
      console.error(
        "Club Clash round insert hatası:",
        insertError,
      );

      if (
        insertError.code ===
        "23505"
      ) {
        const {
          data:
            roundsAfterConflict,
          error:
            conflictReadError,
        } =
          await supabaseAdmin
            .from(
              "duel_club_clash_rounds",
            )
            .select(`
              id,
              duel_id,
              round_no,
              club_a,
              club_b,
              winner_user_id,
              completed_at,
              created_at
            `)
            .eq(
              "duel_id",
              duelId,
            )
            .order(
              "round_no",
              {
                ascending:
                  true,
              },
            );

        if (
          conflictReadError
        ) {
          console.error(
            "Conflict sonrası round okuma hatası:",
            conflictReadError,
          );
        }

        return NextResponse.json({
          ok: true,

          alreadyPrepared:
            true,

          message:
            "2 Takım 1 Oyuncu roundları zaten hazırlanmış.",

          roundCount:
            roundsAfterConflict
              ?.length ??
            0,

          rounds:
            roundsAfterConflict ??
            [],
        });
      }

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
       18. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      alreadyPrepared:
        false,

      message:
        "2 Takım 1 Oyuncu yeni zorluk sistemiyle hazırlandı. ⚽",

      duel: {
        id:
          duel.id,

        gameCode:
          duel.game_code,

        gameLabel:
          "2 Takım 1 Oyuncu",

        status:
          duel.status,
      },

      settings: {
        roundCount:
          ROUND_COUNT,

        roundTierRules:
          ROUND_TIER_RULES,
      },

      dataStats: {
        enabledTeamCount:
          teams.length,

        rawClubRowCount:
          rawClubRows.length,

        eligibleClubRowCount:
          clubRows.length,

        playerCount:
          playerClubs.size,

        validPairCount:
          validPairs.length,
      },

      roundCount:
        insertedRounds
          ?.length ??
        0,

      rounds:
        insertedRounds ??
        [],

      roundDifficultyDebug:
        roundDebug,

      selectedPairDebug:
        selectedPairs.map(
          (
            pair,
            index,
          ) => ({
            roundNo:
              index + 1,

            clubA:
              pair.clubA,

            tierA:
              pair.tierA,

            scoreA:
              pair.scoreA,

            clubB:
              pair.clubB,

            tierB:
              pair.tierB,

            scoreB:
              pair.scoreB,

            sharedPlayers:
              pair.sharedCount,

            rule:
              ROUND_TIER_RULES[
                index
              ],
          }),
        ),
    });
  } catch (error) {
    console.error(
      "Club Clash prepare endpoint hatası:",
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