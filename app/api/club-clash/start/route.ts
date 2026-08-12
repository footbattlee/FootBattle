import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const GAME_DURATION_SECONDS =
  120;

const MAX_PASSES =
  3;

const SCORE_PER_CORRECT =
  20;

const MINIMUM_POPULARITY_SCORE =
  85;

const MINIMUM_TEAM_DUEL_SCORE =
  70;

/*
 * 120 saniyelik oyunda
 * yeterli round hazır olsun.
 */
const ROUND_POOL_SIZE =
  40;

const PLAYER_PAGE_SIZE =
  1000;

const PLAYER_CHUNK_SIZE =
  200;

type TeamRow = {
  name: string;
  duel_score:
    | number
    | null;
};

type ClubRow = {
  player_id: number;
  club_name: string;
};

type PairCandidate = {
  clubA: string;
  clubB: string;

  answerPlayerIds:
    number[];

  qualityScore:
    number;
};

function shuffleArray<T>(
  values: T[],
) {
  const result =
    [...values];

  for (
    let i =
      result.length -
      1;
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
  return [
    clubA,
    clubB,
  ]
    .sort(
      (
        first,
        second,
      ) =>
        first.localeCompare(
          second,
          "tr",
        ),
    )
    .join(
      "|||",
    );
}

/* =========================================================
   POPÜLER OYUNCULAR
========================================================= */

async function loadEligiblePlayerIds() {
  let from =
    0;

  const playerIds:
    number[] =
    [];

  while (
    true
  ) {
    const to =
      from +
      PLAYER_PAGE_SIZE -
      1;

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "guess_players",
        )
        .select(`
          player_id
        `)
        .eq(
          "is_playable",
          1,
        )
        .gte(
          "popularity_score",
          MINIMUM_POPULARITY_SCORE,
        )
        .order(
          "player_id",
          {
            ascending:
              true,
          },
        )
        .range(
          from,
          to,
        );

    if (
      error
    ) {
      throw error;
    }

    const rows =
      data ??
      [];

    for (
      const row
      of rows
    ) {
      const playerId =
        Number(
          row.player_id,
        );

      if (
        Number.isInteger(
          playerId,
        ) &&
        playerId >
          0
      ) {
        playerIds.push(
          playerId,
        );
      }
    }

    if (
      rows.length <
      PLAYER_PAGE_SIZE
    ) {
      break;
    }

    from +=
      PLAYER_PAGE_SIZE;

    if (
      from >
      100_000
    ) {
      throw new Error(
        "Oyuncu havuzu güvenlik sınırını aştı.",
      );
    }
  }

  return Array.from(
    new Set(
      playerIds,
    ),
  );
}

/* =========================================================
   OYUNCU KARİYERLERİ
========================================================= */

async function loadClubRows(
  playerIds: number[],
) {
  const rows:
    ClubRow[] =
    [];

  for (
    let index =
      0;
    index <
    playerIds.length;
    index +=
      PLAYER_CHUNK_SIZE
  ) {
    const chunk =
      playerIds.slice(
        index,
        index +
          PLAYER_CHUNK_SIZE,
      );

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
        .in(
          "player_id",
          chunk,
        )
        .not(
          "club_name",
          "is",
          null,
        );

    if (
      error
    ) {
      throw error;
    }

    rows.push(
      ...(
        (
          data ??
          []
        ) as ClubRow[]
      ),
    );
  }

  return rows;
}

/* =========================================================
   POST
========================================================= */

export async function POST() {
  try {
    /* =====================================================
       1. TAKIM HAVUZU
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
          duel_score
        `)
        .eq(
          "duel_enabled",
          true,
        )
        .gte(
          "duel_score",
          MINIMUM_TEAM_DUEL_SCORE,
        );

    if (
      teamError
    ) {
      throw teamError;
    }

    const teams =
      (
        teamData ??
        []
      ) as TeamRow[];

    if (
      teams.length <
      2
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "2 Takım 1 Oyuncu için yeterli takım bulunamadı.",
        },
        {
          status:
            500,
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
      const name =
        team.name
          ?.trim();

      if (
        !name
      ) {
        continue;
      }

      teamMap.set(
        name,
        team,
      );
    }

    /* =====================================================
       2. 85+ OYUNCULAR
    ===================================================== */

    const eligiblePlayerIds =
      await loadEligiblePlayerIds();

    if (
      eligiblePlayerIds.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun için uygun popüler oyuncu bulunamadı.",
        },
        {
          status:
            500,
        },
      );
    }

    /* =====================================================
       3. KARİYER VERİSİ
    ===================================================== */

    const rawClubRows =
      await loadClubRows(
        eligiblePlayerIds,
      );

    const clubsByPlayer =
      new Map<
        number,
        Set<string>
      >();

    for (
      const row
      of rawClubRows
    ) {
      const playerId =
        Number(
          row.player_id,
        );

      const clubName =
        row.club_name
          ?.trim();

      if (
        !Number.isInteger(
          playerId,
        ) ||
        playerId <=
          0 ||
        !clubName ||
        !teamMap.has(
          clubName,
        )
      ) {
        continue;
      }

      let clubs =
        clubsByPlayer.get(
          playerId,
        );

      if (
        !clubs
      ) {
        clubs =
          new Set<string>();

        clubsByPlayer.set(
          playerId,
          clubs,
        );
      }

      clubs.add(
        clubName,
      );
    }

    /* =====================================================
       4. TAKIM ÇİFTLERİ
    ===================================================== */

    const pairMap =
      new Map<
        string,
        PairCandidate
      >();

    for (
      const [
        playerId,
        clubSet,
      ]
      of clubsByPlayer
    ) {
      const clubs =
        Array.from(
          clubSet,
        );

      if (
        clubs.length <
        2
      ) {
        continue;
      }

      for (
        let firstIndex =
          0;
        firstIndex <
        clubs.length -
          1;
        firstIndex +=
        1
      ) {
        for (
          let secondIndex =
            firstIndex +
            1;
          secondIndex <
          clubs.length;
          secondIndex +=
          1
        ) {
          const firstClub =
            clubs[
              firstIndex
            ];

          const secondClub =
            clubs[
              secondIndex
            ];

          if (
            !firstClub ||
            !secondClub ||
            firstClub ===
              secondClub
          ) {
            continue;
          }

          const firstTeam =
            teamMap.get(
              firstClub,
            );

          const secondTeam =
            teamMap.get(
              secondClub,
            );

          if (
            !firstTeam ||
            !secondTeam
          ) {
            continue;
          }

          const key =
            makePairKey(
              firstClub,
              secondClub,
            );

          const existing =
            pairMap.get(
              key,
            );

          if (
            existing
          ) {
            if (
              !existing
                .answerPlayerIds
                .includes(
                  playerId,
                )
            ) {
              existing
                .answerPlayerIds
                .push(
                  playerId,
                );
            }

            continue;
          }

          const orderedClubs =
            [
              firstClub,
              secondClub,
            ].sort(
              (
                first,
                second,
              ) =>
                first.localeCompare(
                  second,
                  "tr",
                ),
            );

          pairMap.set(
            key,
            {
              clubA:
                orderedClubs[
                  0
                ],

              clubB:
                orderedClubs[
                  1
                ],

              answerPlayerIds:
                [
                  playerId,
                ],

              qualityScore:
                Number(
                  firstTeam
                    .duel_score ??
                    0,
                ) +
                Number(
                  secondTeam
                    .duel_score ??
                    0,
                ),
            },
          );
        }
      }
    }

    /* =====================================================
       5. KALİTELİ PAIR HAVUZU
    ===================================================== */

    const allPairs =
      Array.from(
        pairMap.values(),
      )
        .filter(
          (
            pair,
          ) =>
            pair
              .answerPlayerIds
              .length >
            0,
        )
        .sort(
          (
            first,
            second,
          ) => {
            const firstScore =
              first
                .answerPlayerIds
                .length *
                1000 +
              first
                .qualityScore;

            const secondScore =
              second
                .answerPlayerIds
                .length *
                1000 +
              second
                .qualityScore;

            return (
              secondScore -
              firstScore
            );
          },
        );

    if (
      allPairs.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Ortak oyuncusu bulunan takım eşleşmesi bulunamadı.",
        },
        {
          status:
            500,
        },
      );
    }

    /*
     * Çok zayıf kombinasyonlara
     * düşmemek için en kaliteli
     * ilk 150 pair içinden random.
     */
    const candidatePairs =
      shuffleArray(
        allPairs.slice(
          0,
          Math.min(
            150,
            allPairs.length,
          ),
        ),
      );

    /* =====================================================
       6. ROUND SEÇ

       Öncelik:
       Aynı takım mümkün olduğunca
       yeniden gelmesin.
    ===================================================== */

    const selectedPairs:
      PairCandidate[] =
      [];

    const usedClubs =
      new Set<string>();

    const usedPairKeys =
      new Set<string>();

    /*
     * İlk tur:
     * iki takım da tamamen yeni.
     */
    for (
      const pair
      of candidatePairs
    ) {
      if (
        usedClubs.has(
          pair.clubA,
        ) ||
        usedClubs.has(
          pair.clubB,
        )
      ) {
        continue;
      }

      const key =
        makePairKey(
          pair.clubA,
          pair.clubB,
        );

      selectedPairs.push(
        pair,
      );

      usedPairKeys.add(
        key,
      );

      usedClubs.add(
        pair.clubA,
      );

      usedClubs.add(
        pair.clubB,
      );

      if (
        selectedPairs.length >=
        ROUND_POOL_SIZE
      ) {
        break;
      }
    }

    /*
     * Yeterli round yoksa:
     * takım tekrarına izin ver,
     * ama aynı takım çifti tekrar yok.
     */
    if (
      selectedPairs.length <
      ROUND_POOL_SIZE
    ) {
      for (
        const pair
        of candidatePairs
      ) {
        const key =
          makePairKey(
            pair.clubA,
            pair.clubB,
          );

        if (
          usedPairKeys.has(
            key,
          )
        ) {
          continue;
        }

        selectedPairs.push(
          pair,
        );

        usedPairKeys.add(
          key,
        );

        if (
          selectedPairs.length >=
          ROUND_POOL_SIZE
        ) {
          break;
        }
      }
    }

    if (
      selectedPairs.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun roundları hazırlanamadı.",
        },
        {
          status:
            500,
        },
      );
    }

    /* =====================================================
       7. SESSION
    ===================================================== */

    const {
      data:
        session,

      error:
        sessionError,
    } =
      await supabaseAdmin
        .from(
          "club_clash_sessions",
        )
        .insert({
          score:
            0,

          pass_count:
            0,

          max_passes:
            MAX_PASSES,

          duration_seconds:
            GAME_DURATION_SECONDS,

          completed:
            false,
        })
        .select(`
          id,
          score,
          pass_count,
          max_passes,
          duration_seconds,
          completed,
          created_at
        `)
        .single();

    if (
      sessionError ||
      !session
    ) {
      console.error(
        "Club Clash solo session oluşturma hatası:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Yeni oyun oturumu oluşturulamadı.",
        },
        {
          status:
            500,
        },
      );
    }

    /* =====================================================
       8. ROUNDLARI KAYDET
    ===================================================== */

    const rowsToInsert =
      selectedPairs.map(
        (
          pair,
          index,
        ) => ({
          session_id:
            session.id,

          round_no:
            index +
            1,

          left_club:
            pair.clubA,

          right_club:
            pair.clubB,

          answer_player_ids:
            pair
              .answerPlayerIds,

          attempt_count:
            0,

          completed:
            false,

          passed:
            false,
        }),
      );

    const {
      error:
        roundsError,
    } =
      await supabaseAdmin
        .from(
          "club_clash_rounds",
        )
        .insert(
          rowsToInsert,
        );

    if (
      roundsError
    ) {
      console.error(
        "Club Clash solo round insert hatası:",
        roundsError,
      );

      /*
       * Yarım session kalmasın.
       */
      await supabaseAdmin
        .from(
          "club_clash_sessions",
        )
        .delete()
        .eq(
          "id",
          session.id,
        );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun roundları oluşturulamadı.",
        },
        {
          status:
            500,
        },
      );
    }

    /* =====================================================
       9. RESPONSE
    ===================================================== */

    const firstRound =
      selectedPairs[
        0
      ];

    return NextResponse.json({
      ok: true,

      sessionId:
        session.id,

      score:
        0,

      scorePerCorrect:
        SCORE_PER_CORRECT,

      durationSeconds:
        GAME_DURATION_SECONDS,

      maxPasses:
        MAX_PASSES,

      usedPasses:
        0,

      remainingPasses:
        MAX_PASSES,

      totalPreparedRounds:
        selectedPairs.length,

      round: {
        roundNo:
          1,

        leftClub:
          firstRound.clubA,

        rightClub:
          firstRound.clubB,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Club Clash solo start endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "2 Takım 1 Oyuncu hazırlanırken hata oluştu.",
      },
      {
        status:
          500,
      },
    );
  }
}