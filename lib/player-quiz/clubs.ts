export type RawPlayerQuizClub = {
  id: number;
  club_name: string;
  career_order: number | null;
};

export type SeniorPlayerQuizClub = {
  id: number;
  name: string;
  careerOrder: number;
};

/* =========================================================
   NORMALIZE
========================================================= */

export function normalizePlayerQuizText(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/&/g, " ")
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   YOUTH / RESERVE
========================================================= */

export function isPlayerQuizYouthClub(
  value: unknown,
) {
  const name =
    normalizePlayerQuizText(
      value,
    );

  if (!name) {
    return true;
  }

  return (
    /\bu\s?\d{2}\b/.test(name) ||
    /\byth\b/.test(name) ||
    /\byouth\b/.test(name) ||
    /\bacademy\b/.test(name) ||
    /\bakademi\b/.test(name) ||
    /\breserve\b/.test(name) ||
    /\breserves\b/.test(name) ||
    /\bprimavera\b/.test(name) ||
    /\bjuvenil\b/.test(name) ||
    /\bjuniors?\b/.test(name)
  );
}

/* =========================================================
   CLUB NORMALIZATION
========================================================= */

export function normalizePlayerQuizClubName(
  value: unknown,
) {
  const normalized =
    normalizePlayerQuizText(
      value,
    );

  if (!normalized) {
    return "";
  }

  const removableWords =
    new Set([
      "fc",
      "afc",
      "cf",
      "sc",
      "sk",
      "fk",
      "ac",
      "jk",
      "football",
      "club",
      "futbol",
      "futebol",
      "calcio",
    ]);

  return normalized
    .split(" ")
    .filter(
      (word) =>
        word &&
        !removableWords.has(
          word,
        ),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   CLUB EQUIVALENCE
========================================================= */

export function playerQuizClubsAreEquivalent(
  firstValue: unknown,
  secondValue: unknown,
) {
  const first =
    normalizePlayerQuizClubName(
      firstValue,
    );

  const second =
    normalizePlayerQuizClubName(
      secondValue,
    );

  if (!first || !second) {
    return false;
  }

  if (first === second) {
    return true;
  }

  const shorter =
    first.length <= second.length
      ? first
      : second;

  const longer =
    first.length > second.length
      ? first
      : second;

  /*
   * Brighton
   * Brighton Hove Albion
   */
  if (
    shorter.length >= 6 &&
    (
      longer.startsWith(
        `${shorter} `,
      ) ||
      longer.endsWith(
        ` ${shorter}`,
      )
    )
  ) {
    return true;
  }

  /*
   * Kelime bazlı tolerans.
   */
  const shorterWords =
    shorter.split(" ");

  const longerWords =
    longer.split(" ");

  if (
    shorter.length >= 6 &&
    shorterWords.every(
      (word) =>
        longerWords.includes(
          word,
        ),
    )
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   BUILD CLEAN SENIOR CAREER
========================================================= */

export function buildPlayerQuizSeniorCareer(
  rawClubs: RawPlayerQuizClub[],
): SeniorPlayerQuizClub[] {
  /*
   * Önce altyapıları çıkar.
   */
  const seniorClubs =
    rawClubs.filter(
      (club) =>
        !isPlayerQuizYouthClub(
          club.club_name,
        ),
    );

  /*
   * Gerçek kariyer sırasına koy.
   */
  const sorted =
    [...seniorClubs].sort(
      (
        first,
        second,
      ) =>
        Number(
          first.career_order ??
            999999,
        ) -
        Number(
          second.career_order ??
            999999,
        ),
    );

  /*
   * Aynı kulübü tekrar tekrar sayma.
   */
  const uniqueClubs: {
    id: number;
    name: string;
    originalOrder: number;
  }[] = [];

  for (const club of sorted) {
    const alreadyExists =
      uniqueClubs.some(
        (existing) =>
          playerQuizClubsAreEquivalent(
            existing.name,
            club.club_name,
          ),
      );

    if (alreadyExists) {
      continue;
    }

    uniqueClubs.push({
      id: Number(club.id),

      name:
        club.club_name,

      originalOrder:
        Number(
          club.career_order ??
            0,
        ),
    });
  }

  /*
   * Altyapılar çıktıktan sonra:
   *
   * 4 -> Girona
   * 7 -> Man City
   *
   * gibi kalmasın.
   *
   * Yeniden:
   * 1 -> Girona
   * 2 -> Man City
   */
  return uniqueClubs.map(
    (
      club,
      index,
    ) => ({
      id:
        club.id,

      name:
        club.name,

      careerOrder:
        index + 1,
    }),
  );
}