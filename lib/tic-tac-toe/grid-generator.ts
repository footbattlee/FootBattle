import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   SETTINGS
========================================================= */

export const TIC_TAC_TOE_MINIMUM_POPULARITY_SCORE =
  83;

export const TIC_TAC_TOE_MINIMUM_TEAM_SCORE =
  60;

export const TIC_TAC_TOE_MINIMUM_CELL_PLAYERS =
  1;

const PLAYER_PAGE_SIZE =
  1000;

const PLAYER_CHUNK_SIZE =
  200;

const GRID_SIZE =
  3;

/*
 * Club x Club aramasında en bağlantılı
 * takımlardan başlıyoruz.
 *
 * 387 takımın tamamında kör brute-force
 * yapmak yerine yeterince geniş bir havuz.
 */
const MAX_CLUB_SEARCH_POOL =
  180;

/* =========================================================
   TYPES
========================================================= */

export type TicTacToeAxisType =
  | "club"
  | "nationality";

export type TicTacToeAxisItem = {
  type: TicTacToeAxisType;
  value: string;
};

export type TicTacToeCell = {
  rowIndex: number;
  columnIndex: number;

  row: TicTacToeAxisItem;
  column: TicTacToeAxisItem;

  validPlayerIds: number[];
  validPlayerCount: number;
};

export type TicTacToeGrid = {
  mode:
    | "club_nation"
    | "nation_club"
    | "club_club";

  rows: TicTacToeAxisItem[];
  columns: TicTacToeAxisItem[];

  cells: TicTacToeCell[];

  qualityScore: number;
};

type PlayerRow = {
  player_id: number;

  nationality:
    | string
    | null;

  popularity_score:
    | number
    | null;
};

type ClubRow = {
  player_id: number;

  club_name:
    | string
    | null;
};

type TeamRow = {
  name: string;

  duel_score:
    | number
    | null;
};

type PlayerProfile = {
  playerId: number;

  nationality:
    | string
    | null;

  popularityScore: number;

  clubs: Set<string>;
};

type PairEntry = {
  key: string;

  left: TicTacToeAxisItem;
  right: TicTacToeAxisItem;

  playerIds: number[];
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeValue(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value ??
      "",
  )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

function shuffleArray<T>(
  values: T[],
) {
  const result =
    [...values];

  for (
    let index =
      result.length -
      1;
    index >
      0;
    index -=
      1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (
            index +
            1
          ),
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

function makeTypedKey(
  first: TicTacToeAxisItem,
  second: TicTacToeAxisItem,
) {
  return [
    `${first.type}:${first.value}`,
    `${second.type}:${second.value}`,
  ].join(
    "|||",
  );
}

function makeClubPairKey(
  firstClub: string,
  secondClub: string,
) {
  const clubs =
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

  return [
    `club:${clubs[0]}`,
    `club:${clubs[1]}`,
  ].join(
    "|||",
  );
}

function intersectSets(
  first: Set<string>,
  second: Set<string>,
) {
  const result =
    new Set<string>();

  /*
   * Küçük set üzerinden dönelim.
   */
  const [
    smaller,
    larger,
  ] =
    first.size <=
    second.size
      ? [
          first,
          second,
        ]
      : [
          second,
          first,
        ];

  for (
    const value
    of smaller
  ) {
    if (
      larger.has(
        value,
      )
    ) {
      result.add(
        value,
      );
    }
  }

  return result;
}

/* =========================================================
   LOAD PLAYERS
========================================================= */

async function loadEligiblePlayers() {
  const players:
    PlayerRow[] =
    [];

  let from =
    0;

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
          player_id,
          nationality,
          popularity_score
        `)
        .eq(
          "is_playable",
          1,
        )
        .gte(
          "popularity_score",
          TIC_TAC_TOE_MINIMUM_POPULARITY_SCORE,
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
      (
        data ??
        []
      ) as PlayerRow[];

    players.push(
      ...rows,
    );

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
        "TicTacToe oyuncu havuzu güvenlik sınırını aştı.",
      );
    }
  }

  return players;
}

/* =========================================================
   LOAD TEAMS
========================================================= */

async function loadEligibleTeams() {
  const {
    data,
    error,
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
        TIC_TAC_TOE_MINIMUM_TEAM_SCORE,
      );

  if (
    error
  ) {
    throw error;
  }

  const rows =
    (
      data ??
      []
    ) as TeamRow[];

  const teams =
    new Map<
      string,
      TeamRow
    >();

  for (
    const row
    of rows
  ) {
    const name =
      normalizeValue(
        row.name,
      );

    if (
      !name
    ) {
      continue;
    }

    teams.set(
      name,
      {
        name,

        duel_score:
          row.duel_score,
      },
    );
  }

  return teams;
}

/* =========================================================
   LOAD CLUB HISTORY
========================================================= */

async function loadPlayerClubs(
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
   PLAYER PROFILES
========================================================= */

async function buildPlayerProfiles() {
  const [
    playerRows,
    eligibleTeams,
  ] =
    await Promise.all([
      loadEligiblePlayers(),
      loadEligibleTeams(),
    ]);

  const playerIds =
    playerRows
      .map(
        (
          player,
        ) =>
          Number(
            player.player_id,
          ),
      )
      .filter(
        (
          playerId,
        ) =>
          Number.isInteger(
            playerId,
          ) &&
          playerId >
            0,
      );

  const clubRows =
    await loadPlayerClubs(
      playerIds,
    );

  const profileMap =
    new Map<
      number,
      PlayerProfile
    >();

  for (
    const player
    of playerRows
  ) {
    const playerId =
      Number(
        player.player_id,
      );

    if (
      !Number.isInteger(
        playerId,
      ) ||
      playerId <=
        0
    ) {
      continue;
    }

    profileMap.set(
      playerId,
      {
        playerId,

        nationality:
          normalizeValue(
            player.nationality,
          ) ||
          null,

        popularityScore:
          Number(
            player.popularity_score ??
              0,
          ),

        clubs:
          new Set<string>(),
      },
    );
  }

  for (
    const row
    of clubRows
  ) {
    const playerId =
      Number(
        row.player_id,
      );

    const clubName =
      normalizeValue(
        row.club_name,
      );

    if (
      !clubName ||
      !eligibleTeams.has(
        clubName,
      )
    ) {
      continue;
    }

    const profile =
      profileMap.get(
        playerId,
      );

    if (
      !profile
    ) {
      continue;
    }

    profile.clubs.add(
      clubName,
    );
  }

  const profiles =
    Array.from(
      profileMap.values(),
    ).filter(
      (
        profile,
      ) =>
        profile.clubs.size >
        0,
    );

  console.log(
    "TTT profiles:",
    profiles.length,
  );

  console.log(
    "TTT eligible teams:",
    eligibleTeams.size,
  );

  return {
    profiles,
    eligibleTeams,
  };
}

/* =========================================================
   PAIR MAPS
========================================================= */

function buildPairMaps(
  profiles: PlayerProfile[],
) {
  const clubNationMap =
    new Map<
      string,
      PairEntry
    >();

  const clubClubMap =
    new Map<
      string,
      PairEntry
    >();

  function addPlayer(
    map:
      Map<
        string,
        PairEntry
      >,

    key: string,

    left:
      TicTacToeAxisItem,

    right:
      TicTacToeAxisItem,

    playerId: number,
  ) {
    const existing =
      map.get(
        key,
      );

    if (
      existing
    ) {
      if (
        !existing.playerIds.includes(
          playerId,
        )
      ) {
        existing.playerIds.push(
          playerId,
        );
      }

      return;
    }

    map.set(
      key,
      {
        key,
        left,
        right,

        playerIds:
          [
            playerId,
          ],
      },
    );
  }

  for (
    const profile
    of profiles
  ) {
    const clubs =
      Array.from(
        profile.clubs,
      );

    /* CLUB + NATIONALITY */

    if (
      profile.nationality
    ) {
      for (
        const club
        of clubs
      ) {
        const clubAxis:
          TicTacToeAxisItem =
          {
            type:
              "club",

            value:
              club,
          };

        const nationalityAxis:
          TicTacToeAxisItem =
          {
            type:
              "nationality",

            value:
              profile.nationality,
          };

        const key =
          makeTypedKey(
            clubAxis,
            nationalityAxis,
          );

        addPlayer(
          clubNationMap,
          key,
          clubAxis,
          nationalityAxis,
          profile.playerId,
        );
      }
    }

    /* CLUB + CLUB */

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
          firstClub ===
          secondClub
        ) {
          continue;
        }

        const sorted =
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

        const left:
          TicTacToeAxisItem =
          {
            type:
              "club",

            value:
              sorted[
                0
              ],
          };

        const right:
          TicTacToeAxisItem =
          {
            type:
              "club",

            value:
              sorted[
                1
              ],
          };

        const key =
          makeClubPairKey(
            firstClub,
            secondClub,
          );

        addPlayer(
          clubClubMap,
          key,
          left,
          right,
          profile.playerId,
        );
      }
    }
  }

  return {
    clubNationMap,
    clubClubMap,
  };
}

/* =========================================================
   VALID PAIRS
========================================================= */

function getValidPairs(
  map:
    Map<
      string,
      PairEntry
    >,
) {
  return Array.from(
    map.values(),
  ).filter(
    (
      pair,
    ) =>
      pair.playerIds.length >=
      TIC_TAC_TOE_MINIMUM_CELL_PLAYERS,
  );
}

/* =========================================================
   QUALITY
========================================================= */

function calculateGridQuality(
  cells:
    TicTacToeCell[],
) {
  let score =
    0;

  for (
    const cell
    of cells
  ) {
    const count =
      cell.validPlayerCount;

    /*
     * Tek cevabı olan hücre
     * oynanabilir ama kalite düşük.
     */
    if (
      count ===
      1
    ) {
      score +=
        1;
    } else if (
      count ===
      2
    ) {
      score +=
        3;
    } else if (
      count <=
      4
    ) {
      score +=
        6;
    } else if (
      count <=
      8
    ) {
      score +=
        9;
    } else if (
      count <=
      15
    ) {
      score +=
        10;
    } else {
      score +=
        9;
    }
  }

  return score;
}

/* =========================================================
   BUILD CLUB-NATION ADJACENCY

   club => hangi milliyetlerle geçerli?
========================================================= */

function buildClubNationAdjacency(
  clubNationMap:
    Map<
      string,
      PairEntry
    >,
) {
  const adjacency =
    new Map<
      string,
      Set<string>
    >();

  for (
    const pair
    of getValidPairs(
      clubNationMap,
    )
  ) {
    const club =
      pair.left.value;

    const nationality =
      pair.right.value;

    if (
      !adjacency.has(
        club,
      )
    ) {
      adjacency.set(
        club,
        new Set<string>(),
      );
    }

    adjacency
      .get(
        club,
      )!
      .add(
        nationality,
      );
  }

  return adjacency;
}

/* =========================================================
   SMART CLUB x NATION GRID

   3 takım seçiyoruz.
   Bu üç takımın ORTAK milliyetlerini buluyoruz.

   Böylece 9 hücrenin tamamı garanti.
========================================================= */

function tryBuildClubNationGrid(
  clubNationMap:
    Map<
      string,
      PairEntry
    >,
):
  TicTacToeGrid |
  null {
  const adjacency =
    buildClubNationAdjacency(
      clubNationMap,
    );

  const clubs =
    Array.from(
      adjacency.keys(),
    )
      .filter(
        (
          club,
        ) =>
          (
            adjacency.get(
              club,
            )?.size ??
            0
          ) >=
          GRID_SIZE,
      )
      .sort(
        (
          first,
          second,
        ) =>
          (
            adjacency.get(
              second,
            )?.size ??
            0
          ) -
          (
            adjacency.get(
              first,
            )?.size ??
            0
          ),
      );

  if (
    clubs.length <
    GRID_SIZE
  ) {
    return null;
  }

  /*
   * Biraz çeşitlilik için başlangıç
   * sırasını karıştırıyoruz ama artık
   * kör random grid kurmuyoruz.
   */
  const searchClubs =
    shuffleArray(
      clubs.slice(
        0,
        MAX_CLUB_SEARCH_POOL,
      ),
    );

  let bestGrid:
    TicTacToeGrid |
    null =
    null;

  for (
    let firstIndex =
      0;
    firstIndex <
    searchClubs.length -
      2;
    firstIndex +=
      1
  ) {
    const firstClub =
      searchClubs[
        firstIndex
      ];

    const firstNations =
      adjacency.get(
        firstClub,
      );

    if (
      !firstNations
    ) {
      continue;
    }

    for (
      let secondIndex =
        firstIndex +
        1;
      secondIndex <
      searchClubs.length -
        1;
      secondIndex +=
        1
    ) {
      const secondClub =
        searchClubs[
          secondIndex
        ];

      const secondNations =
        adjacency.get(
          secondClub,
        );

      if (
        !secondNations
      ) {
        continue;
      }

      const firstTwoCommon =
        intersectSets(
          firstNations,
          secondNations,
        );

      if (
        firstTwoCommon.size <
        GRID_SIZE
      ) {
        continue;
      }

      for (
        let thirdIndex =
          secondIndex +
          1;
        thirdIndex <
        searchClubs.length;
        thirdIndex +=
          1
      ) {
        const thirdClub =
          searchClubs[
            thirdIndex
          ];

        const thirdNations =
          adjacency.get(
            thirdClub,
          );

        if (
          !thirdNations
        ) {
          continue;
        }

        const commonNations =
          intersectSets(
            firstTwoCommon,
            thirdNations,
          );

        if (
          commonNations.size <
          GRID_SIZE
        ) {
          continue;
        }

        const selectedClubs =
          [
            firstClub,
            secondClub,
            thirdClub,
          ];

        /*
         * Milliyetleri hücrelerdeki cevap
         * sayısına göre skorlayalım.
         */
        const nationalityScores =
          Array.from(
            commonNations,
          )
            .map(
              (
                nationality,
              ) => {
                let score =
                  0;

                for (
                  const club
                  of selectedClubs
                ) {
                  const pair =
                    clubNationMap.get(
                      makeTypedKey(
                        {
                          type:
                            "club",

                          value:
                            club,
                        },
                        {
                          type:
                            "nationality",

                          value:
                            nationality,
                        },
                      ),
                    );

                  score +=
                    pair?.playerIds.length ??
                    0;
                }

                return {
                  nationality,
                  score,
                };
              },
            )
            .sort(
              (
                first,
                second,
              ) =>
                second.score -
                first.score,
            );

        /*
         * Hep en kolay 3 milliyet çıkmasın.
         * İlk 6 kaliteli seçenekten 3 seç.
         */
        const selectedNationalities =
          shuffleArray(
            nationalityScores
              .slice(
                0,
                6,
              )
              .map(
                (
                  item,
                ) =>
                  item.nationality,
              ),
          ).slice(
            0,
            GRID_SIZE,
          );

        if (
          selectedNationalities.length !==
          GRID_SIZE
        ) {
          continue;
        }

        const rows:
          TicTacToeAxisItem[] =
          selectedNationalities.map(
            (
              nationality,
            ) => ({
              type:
                "nationality",

              value:
                nationality,
            }),
          );

        const columns:
          TicTacToeAxisItem[] =
          selectedClubs.map(
            (
              club,
            ) => ({
              type:
                "club",

              value:
                club,
            }),
          );

        const cells:
          TicTacToeCell[] =
          [];

        let valid =
          true;

        for (
          let rowIndex =
            0;
          rowIndex <
          GRID_SIZE;
          rowIndex +=
            1
        ) {
          for (
            let columnIndex =
              0;
            columnIndex <
            GRID_SIZE;
            columnIndex +=
              1
          ) {
            const nationality =
              rows[
                rowIndex
              ].value;

            const club =
              columns[
                columnIndex
              ].value;

            const pair =
              clubNationMap.get(
                makeTypedKey(
                  {
                    type:
                      "club",

                    value:
                      club,
                  },
                  {
                    type:
                      "nationality",

                    value:
                      nationality,
                  },
                ),
              );

            if (
              !pair ||
              pair.playerIds.length <
                TIC_TAC_TOE_MINIMUM_CELL_PLAYERS
            ) {
              valid =
                false;

              break;
            }

            cells.push({
              rowIndex,
              columnIndex,

              row:
                rows[
                  rowIndex
                ],

              column:
                columns[
                  columnIndex
                ],

              validPlayerIds:
                [
                  ...pair.playerIds,
                ],

              validPlayerCount:
                pair.playerIds.length,
            });
          }

          if (
            !valid
          ) {
            break;
          }
        }

        if (
          !valid ||
          cells.length !==
            9
        ) {
          continue;
        }

        const grid:
          TicTacToeGrid =
          {
            mode:
              "nation_club",

            rows,
            columns,
            cells,

            qualityScore:
              calculateGridQuality(
                cells,
              ),
          };

        if (
          !bestGrid ||
          grid.qualityScore >
            bestGrid.qualityScore
        ) {
          bestGrid =
            grid;
        }

        /*
         * Kalite yeterince iyiyse
         * daha fazla aramaya gerek yok.
         */
        if (
          grid.qualityScore >=
          55
        ) {
          return grid;
        }
      }
    }
  }

  return bestGrid;
}

/* =========================================================
   CLUB x CLUB ADJACENCY

   club => hangi takımlarla ortak oyuncusu var?
========================================================= */

function buildClubClubAdjacency(
  clubClubMap:
    Map<
      string,
      PairEntry
    >,
) {
  const adjacency =
    new Map<
      string,
      Set<string>
    >();

  for (
    const pair
    of getValidPairs(
      clubClubMap,
    )
  ) {
    const firstClub =
      pair.left.value;

    const secondClub =
      pair.right.value;

    if (
      !adjacency.has(
        firstClub,
      )
    ) {
      adjacency.set(
        firstClub,
        new Set<string>(),
      );
    }

    if (
      !adjacency.has(
        secondClub,
      )
    ) {
      adjacency.set(
        secondClub,
        new Set<string>(),
      );
    }

    adjacency
      .get(
        firstClub,
      )!
      .add(
        secondClub,
      );

    adjacency
      .get(
        secondClub,
      )!
      .add(
        firstClub,
      );
  }

  return adjacency;
}

/* =========================================================
   SMART CLUB x CLUB GRID

   Aradığımız yapı aslında K3,3.

   3 satır takımı seçilir.
   Bu üçünün ortak komşuları bulunur.
   Ortak komşulardan 3 sütun takımı seçilir.

   Böylece 9 hücre garanti eşleşir.
========================================================= */

function tryBuildClubClubGrid(
  clubClubMap:
    Map<
      string,
      PairEntry
    >,
):
  TicTacToeGrid |
  null {
  const adjacency =
    buildClubClubAdjacency(
      clubClubMap,
    );

  const clubs =
    Array.from(
      adjacency.keys(),
    )
      .filter(
        (
          club,
        ) =>
          (
            adjacency.get(
              club,
            )?.size ??
            0
          ) >=
          GRID_SIZE,
      )
      .sort(
        (
          first,
          second,
        ) =>
          (
            adjacency.get(
              second,
            )?.size ??
            0
          ) -
          (
            adjacency.get(
              first,
            )?.size ??
            0
          ),
      )
      .slice(
        0,
        MAX_CLUB_SEARCH_POOL,
      );

  if (
    clubs.length <
    GRID_SIZE *
      2
  ) {
    return null;
  }

  const searchClubs =
    shuffleArray(
      clubs,
    );

  let bestGrid:
    TicTacToeGrid |
    null =
    null;

  for (
    let firstIndex =
      0;
    firstIndex <
    searchClubs.length -
      2;
    firstIndex +=
      1
  ) {
    const firstClub =
      searchClubs[
        firstIndex
      ];

    const firstNeighbors =
      adjacency.get(
        firstClub,
      );

    if (
      !firstNeighbors
    ) {
      continue;
    }

    for (
      let secondIndex =
        firstIndex +
        1;
      secondIndex <
      searchClubs.length -
        1;
      secondIndex +=
        1
    ) {
      const secondClub =
        searchClubs[
          secondIndex
        ];

      const secondNeighbors =
        adjacency.get(
          secondClub,
        );

      if (
        !secondNeighbors
      ) {
        continue;
      }

      const firstTwoCommon =
        intersectSets(
          firstNeighbors,
          secondNeighbors,
        );

      /*
       * Satır takımlarını sütun olarak
       * kullanmayacağımız için biraz pay.
       */
      if (
        firstTwoCommon.size <
        GRID_SIZE
      ) {
        continue;
      }

      for (
        let thirdIndex =
          secondIndex +
          1;
        thirdIndex <
        searchClubs.length;
        thirdIndex +=
          1
      ) {
        const thirdClub =
          searchClubs[
            thirdIndex
          ];

        const thirdNeighbors =
          adjacency.get(
            thirdClub,
          );

        if (
          !thirdNeighbors
        ) {
          continue;
        }

        const commonNeighbors =
          intersectSets(
            firstTwoCommon,
            thirdNeighbors,
          );

        /*
         * Aynı takımlar hem satırda
         * hem sütunda olmayacak.
         */
        commonNeighbors.delete(
          firstClub,
        );

        commonNeighbors.delete(
          secondClub,
        );

        commonNeighbors.delete(
          thirdClub,
        );

        if (
          commonNeighbors.size <
          GRID_SIZE
        ) {
          continue;
        }

        const rowClubs =
          [
            firstClub,
            secondClub,
            thirdClub,
          ];

        /*
         * Sütun takımlarını cevap sayısına
         * göre kalite puanla.
         */
        const columnScores =
          Array.from(
            commonNeighbors,
          )
            .map(
              (
                columnClub,
              ) => {
                let score =
                  0;

                for (
                  const rowClub
                  of rowClubs
                ) {
                  const pair =
                    clubClubMap.get(
                      makeClubPairKey(
                        rowClub,
                        columnClub,
                      ),
                    );

                  score +=
                    pair?.playerIds.length ??
                    0;
                }

                return {
                  club:
                    columnClub,

                  score,
                };
              },
            )
            .sort(
              (
                first,
                second,
              ) =>
                second.score -
                first.score,
            );

        const columnClubs =
          shuffleArray(
            columnScores
              .slice(
                0,
                7,
              )
              .map(
                (
                  item,
                ) =>
                  item.club,
              ),
          ).slice(
            0,
            GRID_SIZE,
          );

        if (
          columnClubs.length !==
          GRID_SIZE
        ) {
          continue;
        }

        const rows:
          TicTacToeAxisItem[] =
          rowClubs.map(
            (
              club,
            ) => ({
              type:
                "club",

              value:
                club,
            }),
          );

        const columns:
          TicTacToeAxisItem[] =
          columnClubs.map(
            (
              club,
            ) => ({
              type:
                "club",

              value:
                club,
            }),
          );

        const cells:
          TicTacToeCell[] =
          [];

        let valid =
          true;

        for (
          let rowIndex =
            0;
          rowIndex <
          GRID_SIZE;
          rowIndex +=
            1
        ) {
          for (
            let columnIndex =
              0;
            columnIndex <
            GRID_SIZE;
            columnIndex +=
              1
          ) {
            const rowClub =
              rows[
                rowIndex
              ].value;

            const columnClub =
              columns[
                columnIndex
              ].value;

            const pair =
              clubClubMap.get(
                makeClubPairKey(
                  rowClub,
                  columnClub,
                ),
              );

            if (
              !pair ||
              pair.playerIds.length <
                TIC_TAC_TOE_MINIMUM_CELL_PLAYERS
            ) {
              valid =
                false;

              break;
            }

            cells.push({
              rowIndex,
              columnIndex,

              row:
                rows[
                  rowIndex
                ],

              column:
                columns[
                  columnIndex
                ],

              validPlayerIds:
                [
                  ...pair.playerIds,
                ],

              validPlayerCount:
                pair.playerIds.length,
            });
          }

          if (
            !valid
          ) {
            break;
          }
        }

        if (
          !valid ||
          cells.length !==
            9
        ) {
          continue;
        }

        const grid:
          TicTacToeGrid =
          {
            mode:
              "club_club",

            rows,
            columns,
            cells,

            qualityScore:
              calculateGridQuality(
                cells,
              ),
          };

        if (
          !bestGrid ||
          grid.qualityScore >
            bestGrid.qualityScore
        ) {
          bestGrid =
            grid;
        }

        if (
          grid.qualityScore >=
          55
        ) {
          return grid;
        }
      }
    }
  }

  return bestGrid;
}

/* =========================================================
   PUBLIC GENERATOR
========================================================= */

export async function generateTicTacToeGrid():
  Promise<TicTacToeGrid> {
  const {
    profiles,
  } =
    await buildPlayerProfiles();

  if (
    profiles.length ===
    0
  ) {
    throw new Error(
      "TicTacToe için uygun oyuncu bulunamadı.",
    );
  }

  const {
    clubNationMap,
    clubClubMap,
  } =
    buildPairMaps(
      profiles,
    );

  console.log(
    "TTT clubNation pairs:",
    clubNationMap.size,
  );

  console.log(
    "TTT clubClub pairs:",
    clubClubMap.size,
  );

  /* =====================================================
     İKİ GRID TÜRÜNÜ DE DENE
  ===================================================== */

  const clubNationGrid =
    tryBuildClubNationGrid(
      clubNationMap,
    );

  console.log(
    "TTT clubNation grid:",
    clubNationGrid
      ? {
          quality:
            clubNationGrid.qualityScore,

          rows:
            clubNationGrid.rows.map(
              (
                item,
              ) =>
                item.value,
            ),

          columns:
            clubNationGrid.columns.map(
              (
                item,
              ) =>
                item.value,
            ),
        }
      : null,
  );

  const clubClubGrid =
    tryBuildClubClubGrid(
      clubClubMap,
    );

  console.log(
    "TTT clubClub grid:",
    clubClubGrid
      ? {
          quality:
            clubClubGrid.qualityScore,

          rows:
            clubClubGrid.rows.map(
              (
                item,
              ) =>
                item.value,
            ),

          columns:
            clubClubGrid.columns.map(
              (
                item,
              ) =>
                item.value,
            ),
        }
      : null,
  );

  const candidates =
    [
      clubNationGrid,
      clubClubGrid,
    ].filter(
      (
        grid,
      ):
        grid is TicTacToeGrid =>
        Boolean(
          grid,
        ),
    );

  if (
    candidates.length ===
    0
  ) {
    throw new Error(
      "TicTacToe için çözülebilir 3x3 grid üretilemedi.",
    );
  }

  if (
    candidates.length ===
    1
  ) {
    return candidates[
      0
    ];
  }

  /*
   * Kaliteli olanı daha sık seç.
   * Ama tek tip grid çıkmasın.
   */
  const sorted =
    candidates.sort(
      (
        first,
        second,
      ) =>
        second.qualityScore -
        first.qualityScore,
    );

  const best =
    sorted[
      0
    ];

  const second =
    sorted[
      1
    ];

  /*
   * Arada kalite uçurumu varsa
   * kötü olanı kullanma.
   */
  if (
    best.qualityScore -
      second.qualityScore >=
    20
  ) {
    return best;
  }

  return Math.random() <
    0.65
    ? best
    : second;
}