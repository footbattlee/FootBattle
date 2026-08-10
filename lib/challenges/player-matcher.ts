import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

export type ChallengeConstraintType =
  | "club"
  | "country";

export type ChallengeConstraint = {
  type: ChallengeConstraintType;
  value: string;
};

export type PlayerMatchResult = {
  playerId: number;

  matches: boolean;

  constraints: Array<{
    type: ChallengeConstraintType;
    value: string;
    matches: boolean;
  }>;
};

type PlayerNationalityRow = {
  player_id: number;
  nationality: string | null;
};

type PlayerClubRow = {
  player_id: number;
  club_name: string | null;
};

/* =========================================================
   NORMALIZE
========================================================= */

export function normalizeChallengeText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s'-]/g, "")
    .replace(/\s+/g, " ");
}

/* =========================================================
   CLUB MATCH
========================================================= */

export async function matchesClub(
  playerId: number,
  clubName: string,
) {
  if (
    !Number.isInteger(playerId) ||
    playerId <= 0
  ) {
    return false;
  }

  const normalizedClub =
    normalizeChallengeText(
      clubName,
    );

  if (!normalizedClub) {
    return false;
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("player_quiz_clubs")
      .select(`
        player_id,
        club_name
      `)
      .eq(
        "player_id",
        playerId,
      );

  if (error) {
    throw error;
  }

  const rows =
    (data ??
      []) as PlayerClubRow[];

  return rows.some(
    (row) =>
      normalizeChallengeText(
        row.club_name ??
          "",
      ) ===
      normalizedClub,
  );
}

/* =========================================================
   COUNTRY MATCH
========================================================= */

export async function matchesCountry(
  playerId: number,
  country: string,
) {
  if (
    !Number.isInteger(playerId) ||
    playerId <= 0
  ) {
    return false;
  }

  const normalizedCountry =
    normalizeChallengeText(
      country,
    );

  if (!normalizedCountry) {
    return false;
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("guess_players")
      .select(`
        player_id,
        nationality
      `)
      .eq(
        "player_id",
        playerId,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return false;
  }

  const player =
    data as PlayerNationalityRow;

  return (
    normalizeChallengeText(
      player.nationality ??
        "",
    ) ===
    normalizedCountry
  );
}

/* =========================================================
   SINGLE CONSTRAINT
========================================================= */

export async function matchesConstraint(
  playerId: number,
  constraint: ChallengeConstraint,
) {
  switch (
    constraint.type
  ) {
    case "club":
      return matchesClub(
        playerId,
        constraint.value,
      );

    case "country":
      return matchesCountry(
        playerId,
        constraint.value,
      );

    default:
      return false;
  }
}

/* =========================================================
   MULTIPLE CONSTRAINTS

   Örnek:
   club + club
   club + country
   country + country
========================================================= */

export async function matchesConstraints(
  playerId: number,
  constraints: ChallengeConstraint[],
): Promise<PlayerMatchResult> {
  if (
    !Number.isInteger(playerId) ||
    playerId <= 0
  ) {
    return {
      playerId,

      matches: false,

      constraints:
        constraints.map(
          (constraint) => ({
            ...constraint,

            matches:
              false,
          }),
        ),
    };
  }

  const results =
    await Promise.all(
      constraints.map(
        async (
          constraint,
        ) => ({
          ...constraint,

          matches:
            await matchesConstraint(
              playerId,
              constraint,
            ),
        }),
      ),
    );

  return {
    playerId,

    matches:
      results.every(
        (item) =>
          item.matches,
      ),

    constraints:
      results,
  };
}

/* =========================================================
   TWO CONSTRAINT SHORTCUT

   Club Clash:
   club + club

   Club Country:
   club + country

   Tic Tac Toe:
   row constraint + column constraint
========================================================= */

export async function matchesBothConstraints(
  playerId: number,

  left: ChallengeConstraint,

  right: ChallengeConstraint,
) {
  return matchesConstraints(
    playerId,
    [
      left,
      right,
    ],
  );
}

/* =========================================================
   BULK PLAYER DATA

   Tic Tac Toe gibi oyunlarda hücre kontrolünü çok sık
   yapacağımız için tek tek DB sorgusu yerine
   oyuncunun tüm constraint verisini tek seferde alabiliriz.
========================================================= */

export async function loadPlayerChallengeData(
  playerId: number,
) {
  if (
    !Number.isInteger(playerId) ||
    playerId <= 0
  ) {
    return null;
  }

  const [
    playerResult,
    clubsResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          nationality,
          current_club_name
        `)
        .eq(
          "player_id",
          playerId,
        )
        .maybeSingle(),

      supabaseAdmin
        .from("player_quiz_clubs")
        .select(`
          player_id,
          club_name
        `)
        .eq(
          "player_id",
          playerId,
        ),
    ]);

  if (
    playerResult.error
  ) {
    throw playerResult.error;
  }

  if (
    clubsResult.error
  ) {
    throw clubsResult.error;
  }

  if (
    !playerResult.data
  ) {
    return null;
  }

  const clubs =
    Array.from(
      new Set(
        (
          clubsResult.data ??
          []
        )
          .map(
            (row) =>
              row.club_name
                ?.trim(),
          )
          .filter(
            (
              club,
            ): club is string =>
              Boolean(
                club,
              ),
          ),
      ),
    );

  return {
    playerId,

    name:
      playerResult.data
        .name,

    nationality:
      playerResult.data
        .nationality ??
      null,

    currentClubName:
      playerResult.data
        .current_club_name ??
      null,

    clubs,
  };
}

/* =========================================================
   MATCH FROM PRELOADED DATA

   Özellikle Tic Tac Toe için hızlı yol.
========================================================= */

export function matchesConstraintFromData(
  playerData: {
    nationality:
      | string
      | null;

    clubs: string[];
  },

  constraint: ChallengeConstraint,
) {
  const target =
    normalizeChallengeText(
      constraint.value,
    );

  if (!target) {
    return false;
  }

  if (
    constraint.type ===
    "country"
  ) {
    return (
      normalizeChallengeText(
        playerData.nationality ??
          "",
      ) === target
    );
  }

  if (
    constraint.type ===
    "club"
  ) {
    return playerData.clubs.some(
      (club) =>
        normalizeChallengeText(
          club,
        ) === target,
    );
  }

  return false;
}

/* =========================================================
   MATCH BOTH FROM PRELOADED DATA
========================================================= */

export function matchesBothConstraintsFromData(
  playerData: {
    nationality:
      | string
      | null;

    clubs: string[];
  },

  left: ChallengeConstraint,

  right: ChallengeConstraint,
) {
  return (
    matchesConstraintFromData(
      playerData,
      left,
    ) &&
    matchesConstraintFromData(
      playerData,
      right,
    )
  );
}