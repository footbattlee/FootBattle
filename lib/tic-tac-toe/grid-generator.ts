import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   SETTINGS
========================================================= */

export const TIC_TAC_TOE_MINIMUM_TEAM_SCORE =
  80;

export const TIC_TAC_TOE_MINIMUM_COUNTRY_SCORE =
  80;

export const TIC_TAC_TOE_MINIMUM_CELL_PLAYERS =
  2;

const DB_PAGE_SIZE =
  1000;

const TEAM_QUERY_CHUNK_SIZE =
  35;

const PLAYER_QUERY_CHUNK_SIZE =
  200;

const GRID_SIZE =
  3;

/*
 * En bağlantılı takımlar arasından grid arıyoruz.
 * 180 yerine 70; hem yeterince çeşitli hem çok daha hızlı.
 */
const MAX_CLUB_SEARCH_POOL =
  70;

/*
 * Uygun bir grid bulunduğunda sonsuza kadar
 * "daha iyisini" aramıyoruz.
 */
const GOOD_GRID_QUALITY_SCORE =
  48;

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

type CountryRow = {
  country_name:
    | string
    | null;

  nationality_db_value:
    | string
    | null;

  popularity_score:
    | number
    | null;
};

type PlayerProfile = {
  playerId: number;

  nationality:
    | string
    | null;

  clubs:
    Set<string>;
};

type PairEntry = {
  key: string;

  left:
    TicTacToeAxisItem;

  right:
    TicTacToeAxisItem;

  playerIds:
    number[];
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
  first:
    TicTacToeAxisItem,

  second:
    TicTacToeAxisItem,
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
   ELIGIBLE TEAM HEADERS

   SADECE BAŞLIKLAR PUANLI.
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
   ELIGIBLE COUNTRY HEADERS
========================================================= */

async function loadEligibleCountries() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "challenge_countries",
      )
      .select(`
        country_name,
        nationality_db_value,
        popularity_score
      `)
      .gte(
        "popularity_score",
        TIC_TAC_TOE_MINIMUM_COUNTRY_SCORE,
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
    ) as CountryRow[];

  const countries =
    new Map<
      string,
      CountryRow
    >();

  for (
    const row
    of rows
  ) {
    const dbValue =
      normalizeValue(
        row.nationality_db_value,
      );

    if (
      !dbValue
    ) {
      continue;
    }

    countries.set(
      dbValue,
      row,
    );
  }

  return countries;
}

/* =========================================================
   ONLY RELEVANT CLUB HISTORY

   Eski kod:
   bütün playable oyuncuları çekiyor,
   sonra tüm kariyerlerini okuyordu.

   Yeni kod:
   önce uygun takım adlarını biliyor.
   player_quiz_clubs içinden SADECE bu takımlardaki
   kariyer satırlarını getiriyor.

   En büyük performans kazancı burada.
========================================================= */

async function loadRelevantClubRows(
  eligibleTeamNames:
    string[],
) {
  const rows:
    ClubRow[] =
    [];

  for (
    let teamIndex =
      0;
    teamIndex <
    eligibleTeamNames.length;
    teamIndex +=
      TEAM_QUERY_CHUNK_SIZE
  ) {
    const teamChunk =
      eligibleTeamNames.slice(
        teamIndex,
        teamIndex +
          TEAM_QUERY_CHUNK_SIZE,
      );

    let from =
      0;

    while (
      true
    ) {
      const to =
        from +
        DB_PAGE_SIZE -
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
          .in(
            "club_name",
            teamChunk,
          )
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
          .range(
            from,
            to,
          );

      if (
        error
      ) {
        throw error;
      }

      const pageRows =
        (
          data ??
          []
        ) as ClubRow[];

      rows.push(
        ...pageRows,
      );

      if (
        pageRows.length <
        DB_PAGE_SIZE
      ) {
        break;
      }

      from +=
        DB_PAGE_SIZE;

      if (
        from >
        100_000
      ) {
        throw new Error(
          "TicTacToe kulüp geçmişi güvenlik sınırını aştı.",
        );
      }
    }
  }

  return rows;
}

/* =========================================================
   LOAD ONLY PLAYERS WHO APPEAR IN RELEVANT CLUB ROWS

   Cevap oyuncusunda popularity filtresi YOK.
========================================================= */

async function loadRelevantPlayablePlayers(
  playerIds:
    number[],
) {
  const rows:
    PlayerRow[] =
    [];

  for (
    let index =
      0;
    index <
    playerIds.length;
    index +=
      PLAYER_QUERY_CHUNK_SIZE
  ) {
    const chunk =
      playerIds.slice(
        index,
        index +
          PLAYER_QUERY_CHUNK_SIZE,
      );

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
          nationality
        `)
        .eq(
          "is_playable",
          1,
        )
        .in(
          "player_id",
          chunk,
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
        ) as PlayerRow[]
      ),
    );
  }

  return rows;
}

/* =========================================================
   BUILD PLAYER PROFILES
========================================================= */

async function buildPlayerProfiles() {
  const [
    eligibleTeams,
    eligibleCountries,
  ] =
    await Promise.all([
      loadEligibleTeams(),
      loadEligibleCountries(),
    ]);

  const eligibleTeamNames =
    Array.from(
      eligibleTeams.keys(),
    );

  if (
    eligibleTeamNames.length ===
    0
  ) {
    return {
      profiles:
        [] as PlayerProfile[],

      eligibleTeams,
      eligibleCountries,
    };
  }

  const clubRows =
    await loadRelevantClubRows(
      eligibleTeamNames,
    );

  /*
   * Aynı oyuncunun aynı kulübü kariyerde birkaç kez
   * geçmiş olabilir. Burada player id havuzunu tekilleştiriyoruz.
   */
  const relevantPlayerIds =
    Array.from(
      new Set(
        clubRows
          .map(
            (
              row,
            ) =>
              Number(
                row.player_id,
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
          ),
      ),
    );

  const playerRows =
    await loadRelevantPlayablePlayers(
      relevantPlayerIds,
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

    const nationality =
      normalizeValue(
        player.nationality,
      );

    profileMap.set(
      playerId,
      {
        playerId,

        nationality:
          nationality &&
          eligibleCountries.has(
            nationality,
          )
            ? nationality
            : null,

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

    const profile =
      profileMap.get(
        playerId,
      );

    if (
      !profile
    ) {
      /*
       * is_playable = 0 olan oyuncu olabilir.
       */
      continue;
    }

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
    "TTT perf - eligible teams:",
    eligibleTeams.size,
  );

  console.log(
    "TTT perf - relevant club rows:",
    clubRows.length,
  );

  console.log(
    "TTT perf - relevant playable players:",
    profiles.length,
  );

  return {
    profiles,
    eligibleTeams,
    eligibleCountries,
  };
}

/* =========================================================
   BUILD PAIR MAPS
========================================================= */

function buildPairMaps(
  profiles:
    PlayerProfile[],
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

    playerId:
      number,
  ) {
    const existing =
      map.get(
        key,
      );

    if (
      existing
    ) {
      /*
       * Aynı oyuncu aynı kulübü kariyerde
       * birkaç defa geçmiş olsa bile tekrar ekleme.
       */
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

        addPlayer(
          clubNationMap,

          makeTypedKey(
            clubAxis,
            nationalityAxis,
          ),

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

        addPlayer(
          clubClubMap,

          makeClubPairKey(
            firstClub,
            secondClub,
          ),

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

    if (
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
   CLUB-NATION ADJACENCY
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
      )
      .slice(
        0,
        MAX_CLUB_SEARCH_POOL,
      );

  if (
    clubs.length <
    GRID_SIZE
  ) {
    return null;
  }

  /*
   * En bağlantılı havuz korunuyor,
   * sadece sıra randomlaşıyor.
   */
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
         * Milliyetler random, ama zaten üç takımın da
         * her biriyle minimum 2 cevapları var.
         */
        const selectedNationalities =
          shuffleArray(
            Array.from(
              commonNations,
            ),
          ).slice(
            0,
            GRID_SIZE,
          );

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
         * Yeterince kaliteli ilk gridde çık.
         * Burada saniyeler kazandırıyoruz.
         */
        if (
          grid.qualityScore >=
          GOOD_GRID_QUALITY_SCORE
        ) {
          return grid;
        }
      }
    }
  }

  return bestGrid;
}

/* =========================================================
   CLUB-CLUB ADJACENCY
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

        const columnClubs =
          shuffleArray(
            Array.from(
              commonNeighbors,
            ),
          ).slice(
            0,
            GRID_SIZE,
          );

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
          GOOD_GRID_QUALITY_SCORE
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
  const startedAt =
    Date.now();

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

  /*
   * Önce daha ucuz/oynanabilir club+nation dene.
   * İyi grid çıkarsa club+club brute-force'a hiç girme.
   */
  const clubNationGrid =
    tryBuildClubNationGrid(
      clubNationMap,
    );

  if (
    clubNationGrid &&
    clubNationGrid.qualityScore >=
      GOOD_GRID_QUALITY_SCORE
  ) {
    console.log(
      "TTT perf - generated in ms:",
      Date.now() -
        startedAt,
    );

    return clubNationGrid;
  }

  const clubClubGrid =
    tryBuildClubClubGrid(
      clubClubMap,
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

  candidates.sort(
    (
      first,
      second,
    ) =>
      second.qualityScore -
      first.qualityScore,
  );

  console.log(
    "TTT perf - generated in ms:",
    Date.now() -
      startedAt,
  );

  return candidates[
    0
  ];
}