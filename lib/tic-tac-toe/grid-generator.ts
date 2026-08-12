import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   SETTINGS
========================================================= */

export const TIC_TAC_TOE_MINIMUM_POPULARITY_SCORE =
  75;

export const TIC_TAC_TOE_MINIMUM_TEAM_SCORE =
  50;

export const TIC_TAC_TOE_MINIMUM_CELL_PLAYERS =
  1;

const PLAYER_PAGE_SIZE =
  1000;

const PLAYER_CHUNK_SIZE =
  200;

const GRID_SIZE =
  3;

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

  rows:
    TicTacToeAxisItem[];

  columns:
    TicTacToeAxisItem[];

  cells:
    TicTacToeCell[];

  /*
   * Grid kalite puanı.
   * Yüksek olması daha rahat oynanan
   * bir grid demek.
   */
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

  popularityScore:
    number;

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

function uniqueStrings(
  values: string[],
) {
  return Array.from(
    new Set(
      values
        .map(
          normalizeValue,
        )
        .filter(
          Boolean,
        ),
    ),
  );
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

function getCellKey(
  row:
    TicTacToeAxisItem,

  column:
    TicTacToeAxisItem,
) {
  if (
    row.type ===
      "club" &&
    column.type ===
      "club"
  ) {
    return makeClubPairKey(
      row.value,
      column.value,
    );
  }

  return makeTypedKey(
    row,
    column,
  );
}

/* =========================================================
   LOAD ELIGIBLE PLAYERS
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
   LOAD ELIGIBLE TEAMS
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
   LOAD PLAYER CLUBS
========================================================= */

async function loadPlayerClubs(
  playerIds:
    number[],
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
   BUILD PLAYER PROFILES
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

  return {
    profiles:
      Array.from(
        profileMap.values(),
      ).filter(
        (
          profile,
        ) =>
          profile.clubs.size >
          0,
      ),

    eligibleTeams,
  };
}

/* =========================================================
   BUILD PAIR MAP

   Burada üç farklı kesişim havuzu hazırlanıyor:

   club + nationality
   nationality + club
   club + club
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

  const nationClubMap =
    new Map<
      string,
      PairEntry
    >();

  const clubClubMap =
    new Map<
      string,
      PairEntry
    >();

  function addPlayerToPair(
    map:
      Map<
        string,
        PairEntry
      >,

    key:
      string,

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

    /* =====================================================
       CLUB + NATION
    ===================================================== */

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

        const clubNationKey =
          makeTypedKey(
            clubAxis,
            nationalityAxis,
          );

        addPlayerToPair(
          clubNationMap,
          clubNationKey,
          clubAxis,
          nationalityAxis,
          profile.playerId,
        );

        const nationClubKey =
          makeTypedKey(
            nationalityAxis,
            clubAxis,
          );

        addPlayerToPair(
          nationClubMap,
          nationClubKey,
          nationalityAxis,
          clubAxis,
          profile.playerId,
        );
      }
    }

    /* =====================================================
       CLUB + CLUB
    ===================================================== */

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

        const sortedClubs =
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
              sortedClubs[
                0
              ],
          };

        const right:
          TicTacToeAxisItem =
          {
            type:
              "club",

            value:
              sortedClubs[
                1
              ],
          };

        const key =
          makeClubPairKey(
            left.value,
            right.value,
          );

        addPlayerToPair(
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
    nationClubMap,
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
   BUILD GRID CELLS
========================================================= */

function buildCells(
  rows:
    TicTacToeAxisItem[],

  columns:
    TicTacToeAxisItem[],

  pairMap:
    Map<
      string,
      PairEntry
    >,
) {
  const cells:
    TicTacToeCell[] =
    [];

  for (
    let rowIndex =
      0;
    rowIndex <
    rows.length;
    rowIndex +=
      1
  ) {
    for (
      let columnIndex =
        0;
      columnIndex <
      columns.length;
      columnIndex +=
        1
    ) {
      const row =
        rows[
          rowIndex
        ];

      const column =
        columns[
          columnIndex
        ];

      /*
       * Takım kendisiyle
       * kesişemez.
       */
      if (
        row.type ===
          "club" &&
        column.type ===
          "club" &&
        row.value ===
          column.value
      ) {
        return null;
      }

      const key =
        getCellKey(
          row,
          column,
        );

      const pair =
        pairMap.get(
          key,
        );

      if (
        !pair ||
        pair.playerIds.length <
          TIC_TAC_TOE_MINIMUM_CELL_PLAYERS
      ) {
        return null;
      }

      cells.push({
        rowIndex,
        columnIndex,

        row,
        column,

        validPlayerIds:
          [
            ...pair.playerIds,
          ],

        validPlayerCount:
          pair.playerIds.length,
      });
    }
  }

  return cells;
}

/* =========================================================
   GRID QUALITY

   Çok az cevabı olan hücreler
   grid kalitesini düşürüyor.

   Ama 50 cevabı olan hücreyi de
   sonsuz yüksek saymıyoruz.
========================================================= */

function calculateGridQuality(
  cells:
    TicTacToeCell[],
) {
  if (
    cells.length ===
    0
  ) {
    return 0;
  }

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
        2;
    } else if (
      count <=
      4
    ) {
      score +=
        5;
    } else if (
      count <=
      8
    ) {
      score +=
        8;
    } else if (
      count <=
      15
    ) {
      score +=
        10;
    } else {
      score +=
        8;
    }
  }

  return score;
}

/* =========================================================
   TRY CLUB x NATION
========================================================= */

function tryBuildClubNationGrid(
  clubNationMap:
    Map<
      string,
      PairEntry
    >,
) {
  const validPairs =
    getValidPairs(
      clubNationMap,
    );

  const clubs =
    uniqueStrings(
      validPairs.map(
        (
          pair,
        ) =>
          pair.left.value,
      ),
    );

  const nationalities =
    uniqueStrings(
      validPairs.map(
        (
          pair,
        ) =>
          pair.right.value,
      ),
    );

  if (
    clubs.length <
      GRID_SIZE ||
    nationalities.length <
      GRID_SIZE
  ) {
    return null;
  }

  /*
   * Random denemeler.
   */
  for (
    let attempt =
      0;
    attempt <
    250;
    attempt +=
      1
  ) {
    const selectedClubs =
      shuffleArray(
        clubs,
      ).slice(
        0,
        GRID_SIZE,
      );

    const selectedNationalities =
      shuffleArray(
        nationalities,
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

    /*
     * pair map club -> nation şeklinde.
     *
     * Grid ise row nation,
     * column club.
     *
     * O yüzden key'i ters
     * oluşturuyoruz.
     */
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
        const row =
          rows[
            rowIndex
          ];

        const column =
          columns[
            columnIndex
          ];

        const key =
          makeTypedKey(
            column,
            row,
          );

        const pair =
          clubNationMap.get(
            key,
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

          row,
          column,

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

    return {
      mode:
        "nation_club" as const,

      rows,
      columns,
      cells,

      qualityScore:
        calculateGridQuality(
          cells,
        ),
    };
  }

  return null;
}

/* =========================================================
   TRY CLUB x CLUB
========================================================= */

function tryBuildClubClubGrid(
  clubClubMap:
    Map<
      string,
      PairEntry
    >,
) {
  const validPairs =
    getValidPairs(
      clubClubMap,
    );

  const clubs =
    uniqueStrings(
      validPairs.flatMap(
        (
          pair,
        ) => [
          pair.left.value,
          pair.right.value,
        ],
      ),
    );

  if (
    clubs.length <
    GRID_SIZE *
      2
  ) {
    return null;
  }

  for (
    let attempt =
      0;
    attempt <
    400;
    attempt +=
      1
  ) {
    const shuffled =
      shuffleArray(
        clubs,
      );

    const rowClubs =
      shuffled.slice(
        0,
        GRID_SIZE,
      );

    const columnClubs =
      shuffled.slice(
        GRID_SIZE,
        GRID_SIZE *
          2,
      );

    /*
     * Aynı takım iki eksende
     * görünmesin.
     */
    if (
      rowClubs.some(
        (
          club,
        ) =>
          columnClubs.includes(
            club,
          ),
      )
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

    const cells =
      buildCells(
        rows,
        columns,
        clubClubMap,
      );

    if (
      !cells ||
      cells.length !==
        9
    ) {
      continue;
    }

    return {
      mode:
        "club_club" as const,

      rows,
      columns,
      cells,

      qualityScore:
        calculateGridQuality(
          cells,
        ),
    };
  }

  return null;
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

  /*
   * İki türü de üretmeye
   * çalışıyoruz.
   *
   * Sonra kalite puanı
   * daha yüksek olanı seçiyoruz.
   */
  const candidates:
    TicTacToeGrid[] =
    [];

  const clubNationGrid =
    tryBuildClubNationGrid(
      clubNationMap,
    );

  if (
    clubNationGrid
  ) {
    candidates.push(
      clubNationGrid,
    );
  }

  const clubClubGrid =
    tryBuildClubClubGrid(
      clubClubMap,
    );

  if (
    clubClubGrid
  ) {
    candidates.push(
      clubClubGrid,
    );
  }

  if (
    candidates.length ===
    0
  ) {
    throw new Error(
      "TicTacToe için çözülebilir 3x3 grid üretilemedi.",
    );
  }

  /*
   * Sadece hep aynı tip
   * çıkmasın diye en iyi iki
   * grid arasında hafif random.
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

  if (
    sorted.length ===
    1
  ) {
    return sorted[0];
  }

  const best =
    sorted[0];

  const second =
    sorted[1];

  /*
   * Kalite farkı çok büyükse
   * net şekilde iyiyi kullan.
   */
  if (
    best.qualityScore -
      second.qualityScore >=
    15
  ) {
    return best;
  }

  return Math.random() <
    0.6
    ? best
    : second;
}