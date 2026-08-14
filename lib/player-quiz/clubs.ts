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
   GEÇERSİZ / KULÜPSÜZ KAYITLAR
========================================================= */

export function isPlayerQuizInvalidClub(
  value: unknown,
) {
  const name =
    normalizePlayerQuizText(
      value,
    );

  if (!name) {
    return true;
  }

  /*
   * Transfermarkt vb. kaynaklarda gerçek kulüp yerine
   * statü olarak gelebilen kayıtlar.
   */
  return (
    name ===
      "without club" ||
    name ===
      "no club" ||
    name ===
      "without team" ||
    name ===
      "no team" ||
    name ===
      "unattached" ||
    name ===
      "free agent" ||
    name ===
      "free agents" ||
    name ===
      "retired" ||
    name ===
      "career break" ||
    name ===
      "career break end" ||
    name ===
      "unknown" ||
    name ===
      "none"
  );
}

/* =========================================================
   YOUTH / RESERVE / B TEAM
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

  if (
    isPlayerQuizInvalidClub(
      name,
    )
  ) {
    return true;
  }

  return (
    /*
     * U15, U17, U19, U21, U23 vb.
     */
    /\bu\s?\d{2}\b/.test(
      name,
    ) ||

    /*
     * Youth / academy
     */
    /\byth\b/.test(
      name,
    ) ||
    /\byouth\b/.test(
      name,
    ) ||
    /\bacademy\b/.test(
      name,
    ) ||
    /\bakademi\b/.test(
      name,
    ) ||
    /\bprimavera\b/.test(
      name,
    ) ||
    /\bjuvenil\b/.test(
      name,
    ) ||
    /\bjuniors?\b/.test(
      name,
    ) ||

    /*
     * Reserve
     */
    /\breserve\b/.test(
      name,
    ) ||
    /\breserves\b/.test(
      name,
    ) ||

    /*
     * B Team / Team B
     */
    /\bb team\b/.test(
      name,
    ) ||
    /\bteam b\b/.test(
      name,
    ) ||

    /*
     * Örnek:
     * Barcelona B
     * Real Madrid B
     *
     * Tek başına son kelime "b" ise reserve kabul et.
     */
    /\sb$/.test(
      name,
    ) ||

    /*
     * Bazı kulüpler:
     * Bayern Munich II
     * Borussia Dortmund II
     *
     * Sadece sondaki "ii" reserve göstergesi olarak alınır.
     */
    /\sii$/.test(
      name,
    )
  );
}

/* =========================================================
   SENIOR CLUB KONTROLÜ
========================================================= */

export function isPlayerQuizSeniorClub(
  value: unknown,
) {
  return (
    !isPlayerQuizInvalidClub(
      value,
    ) &&
    !isPlayerQuizYouthClub(
      value,
    )
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
    first.length <=
    second.length
      ? first
      : second;

  const longer =
    first.length >
    second.length
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
   * Gerçek senior kulüp olmayan her şeyi çıkar:
   *
   * - Without Club
   * - Retired
   * - Free Agent
   * - U15 / U17 / U19...
   * - Youth
   * - Academy
   * - Reserve
   * - B Team
   * - Bayern II vb.
   */
  const seniorClubs =
    rawClubs.filter(
      (club) =>
        isPlayerQuizSeniorClub(
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

  for (
    const club of
      sorted
  ) {
    const cleanName =
      club.club_name?.trim();

    if (!cleanName) {
      continue;
    }

    const alreadyExists =
      uniqueClubs.some(
        (existing) =>
          playerQuizClubsAreEquivalent(
            existing.name,
            cleanName,
          ),
      );

    if (alreadyExists) {
      continue;
    }

    uniqueClubs.push({
      id:
        Number(
          club.id,
        ),

      name:
        cleanName,

      originalOrder:
        Number(
          club.career_order ??
            0,
        ),
    });
  }

  /*
   * Filtreleme sonrası career_order'ı yeniden sırala.
   *
   * Örnek eski:
   * 1 Sporting U15
   * 4 Sporting
   * 7 Man United
   *
   * Yeni:
   * 1 Sporting
   * 2 Man United
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