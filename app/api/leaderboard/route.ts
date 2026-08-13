import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/server";

const VALID_GAME_CODES =
  new Set([
    "wordle",
    "guess_the_player",
    "player_quiz",
    "tic_tac_toe",

    /*
     * Bunlar ana kartta görünmese bile
     * endpoint üzerinden kullanılabilir.
     */
    "career_path",
    "club_clash",
    "club_nation",
    "transfer_quiz",
  ]);

/* =========================================================
   WEEK START

   Pazartesi 00:00 Europe/Istanbul mantığına
   yakın çalışacak şekilde tarih anahtarı üretiyoruz.
========================================================= */

function getTurkeyWeekStart() {
  const now =
    new Date();

  /*
   * Türkiye saatini ayrı tarih olarak oluştur.
   */
  const turkeyDateString =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Istanbul",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    ).format(
      now,
    );

  const [
    year,
    month,
    day,
  ] =
    turkeyDateString
      .split("-")
      .map(
        Number,
      );

  /*
   * UTC kullanıyoruz çünkü burada
   * sadece haftanın gününü bulmamız gerekiyor.
   */
  const turkeyDay =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  const dayOfWeek =
    turkeyDay.getUTCDay();

  /*
   * JS:
   * Pazar = 0
   * Pazartesi = 1
   */
  const daysSinceMonday =
    dayOfWeek ===
    0
      ? 6
      : dayOfWeek -
        1;

  turkeyDay.setUTCDate(
    turkeyDay.getUTCDate() -
      daysSinceMonday,
  );

  const weekYear =
    turkeyDay.getUTCFullYear();

  const weekMonth =
    String(
      turkeyDay.getUTCMonth() +
        1,
    ).padStart(
      2,
      "0",
    );

  const weekDay =
    String(
      turkeyDay.getUTCDate(),
    ).padStart(
      2,
      "0",
    );

  /*
   * İstanbul UTC+3.
   *
   * Pazartesi 00:00 TR =
   * Pazar 21:00 UTC.
   */
  return new Date(
    `${weekYear}-${weekMonth}-${weekDay}T00:00:00+03:00`,
  ).toISOString();
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const game =
      url.searchParams
        .get(
          "game",
        )
        ?.trim() ||
      "overall";

    const period =
      url.searchParams
        .get(
          "period",
        )
        ?.trim() ||
      "week";

    const limitParam =
      Number(
        url.searchParams.get(
          "limit",
        ) ??
          "10",
      );

    const limit =
      Number.isFinite(
        limitParam,
      )
        ? Math.min(
            Math.max(
              limitParam,
              1,
            ),
            100,
          )
        : 10;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      game !==
        "overall" &&
      !VALID_GAME_CODES.has(
        game,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçersiz leaderboard türü.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      period !==
        "week" &&
      period !==
        "all"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçersiz leaderboard periyodu.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       DATE FILTER
    ===================================================== */

    const weekStart =
      getTurkeyWeekStart();

    /* =====================================================
       GAME RESULTS

       GENEL:
       tüm oyunlar

       GAME:
       sadece seçilen oyun
    ===================================================== */

    let resultsQuery =
      supabaseAdmin
        .from(
          "game_results",
        )
        .select(`
          user_id,
          game_code,
          score,
          won,
          created_at
        `)
        .not(
          "user_id",
          "is",
          null,
        );

    if (
      game !==
      "overall"
    ) {
      resultsQuery =
        resultsQuery.eq(
          "game_code",
          game,
        );
    }

    if (
      period ===
      "week"
    ) {
      resultsQuery =
        resultsQuery.gte(
          "created_at",
          weekStart,
        );
    }

    const {
      data:
        results,

      error:
        resultsError,
    } =
      await resultsQuery;

    if (
      resultsError
    ) {
      throw resultsError;
    }

    /* =====================================================
       USER TOTALS
    ===================================================== */

    const totals =
      new Map<
        string,
        {
          score: number;

          gamesPlayed: number;

          gamesWon: number;
        }
      >();

    for (
      const result of
        results ?? []
    ) {
      const userId =
        result.user_id;

      if (
        !userId
      ) {
        continue;
      }

      const current =
        totals.get(
          userId,
        ) ?? {
          score: 0,
          gamesPlayed: 0,
          gamesWon: 0,
        };

      current.score +=
        Number(
          result.score ??
            0,
        );

      current.gamesPlayed +=
        1;

      if (
        result.won
      ) {
        current.gamesWon +=
          1;
      }

      totals.set(
        userId,
        current,
      );
    }

    /* =====================================================
       SORT
    ===================================================== */

    const rankedUsers =
      [
        ...totals.entries(),
      ]
        .sort(
          (
            a,
            b,
          ) => {
            /*
             * 1. Puan
             */
            if (
              b[1].score !==
              a[1].score
            ) {
              return (
                b[1].score -
                a[1].score
              );
            }

            /*
             * 2. Galibiyet
             */
            if (
              b[1].gamesWon !==
              a[1].gamesWon
            ) {
              return (
                b[1].gamesWon -
                a[1].gamesWon
              );
            }

            /*
             * 3. Aynı puanı daha az
             * oyunla yaptıysa önde.
             */
            return (
              a[1].gamesPlayed -
              b[1].gamesPlayed
            );
          },
        )
        .slice(
          0,
          limit,
        );

    /* =====================================================
       EMPTY
    ===================================================== */

    if (
      rankedUsers.length ===
      0
    ) {
      return NextResponse.json({
        ok: true,

        type:
          game,

        period,

        weekStart,

        leaderboard:
          [],
      });
    }

    /* =====================================================
       PROFILES
    ===================================================== */

    const userIds =
      rankedUsers.map(
        (
          [
            userId,
          ],
        ) =>
          userId,
      );

    const {
      data:
        profiles,

      error:
        profilesError,
    } =
      await supabaseAdmin
        .from(
          "profiles",
        )
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          current_streak,
          best_streak
        `)
        .in(
          "id",
          userIds,
        );

    if (
      profilesError
    ) {
      throw profilesError;
    }

    const profileMap =
      new Map(
        (
          profiles ??
          []
        ).map(
          (
            profile,
          ) => [
            profile.id,
            profile,
          ],
        ),
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    const leaderboard =
      rankedUsers.map(
        (
          [
            userId,
            stats,
          ],

          index,
        ) => {
          const profile =
            profileMap.get(
              userId,
            );

          return {
            rank:
              index +
              1,

            userId,

            username:
              profile?.username ??
              null,

            displayName:
              profile?.display_name ??
              profile?.username ??
              "FootBattle Oyuncusu",

            avatarUrl:
              profile?.avatar_url ??
              null,

            score:
              stats.score,

            gamesPlayed:
              stats.gamesPlayed,

            gamesWon:
              stats.gamesWon,

            currentStreak:
              Number(
                profile?.current_streak ??
                  0,
              ),

            bestStreak:
              Number(
                profile?.best_streak ??
                  0,
              ),
          };
        },
      );

    return NextResponse.json({
      ok: true,

      type:
        game,

      period,

      weekStart,

      leaderboard,
    });
  } catch (
    error
  ) {
    console.error(
      "Leaderboard endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Leaderboard yüklenemedi.",
      },
      {
        status: 500,
      },
    );
  }
}

