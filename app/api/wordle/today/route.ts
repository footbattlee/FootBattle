import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;

const MINIMUM_POPULARITY_SCORE =
  84;

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat(
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
    new Date(),
  );
}

function getLastName(
  nameNormalized: string,
) {
  const parts =
    nameNormalized
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  return (
    parts.at(-1) ??
    ""
  );
}

function normalizeSurname(
  nameNormalized: string,
) {
  return getLastName(
    nameNormalized,
  )
    .toLocaleUpperCase(
      "tr-TR",
    )
    .replace(
      /İ/g,
      "I",
    )
    .replace(
      /Ç/g,
      "C",
    )
    .replace(
      /Ğ/g,
      "G",
    )
    .replace(
      /Ö/g,
      "O",
    )
    .replace(
      /Ş/g,
      "S",
    )
    .replace(
      /Ü/g,
      "U",
    );
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const dailyMode =
      url.searchParams.get(
        "daily",
      ) === "1";

    let selectedPlayer:
      | {
          player_id: number;
          name: string;
          name_normalized: string;
          popularity_score:
            number | null;
        }
      | null =
      null;

    let answer =
      "";

    /* =====================================================
       1. DAILY MODE
    ===================================================== */

    if (dailyMode) {
      const playDate =
        getTurkeyDateKey();

      const {
        data:
          dailyRow,

        error:
          dailyError,
      } =
        await supabaseAdmin
          .from(
            "daily_wordle",
          )
          .select(`
            player_id,
            is_published
          `)
          .eq(
            "play_date",
            playDate,
          )
          .eq(
            "is_published",
            true,
          )
          .maybeSingle();

      if (dailyError) {
        console.error(
          "Daily Wordle okunamadı:",
          dailyError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Wordle bilgisi okunamadı.",
          },
          {
            status: 500,
          },
        );
      }

      if (!dailyRow) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Wordle oyunu henüz yayınlanmadı.",
          },
          {
            status: 404,
          },
        );
      }

      const {
        data:
          dailyPlayer,

        error:
          playerError,
      } =
        await supabaseAdmin
          .from(
            "guess_players",
          )
          .select(`
            player_id,
            name,
            name_normalized,
            popularity_score
          `)
          .eq(
            "player_id",
            dailyRow.player_id,
          )
          .eq(
            "is_playable",
            1,
          )
          .maybeSingle();

      if (
        playerError ||
        !dailyPlayer ||
        !dailyPlayer
          .name_normalized
      ) {
        console.error(
          "Daily Wordle oyuncusu okunamadı:",
          playerError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Wordle oyuncusu bulunamadı.",
          },
          {
            status: 404,
          },
        );
      }

      const surname =
        normalizeSurname(
          dailyPlayer
            .name_normalized,
        );

      if (
        !/^[A-Z]+$/.test(
          surname,
        ) ||
        surname.length <
          4 ||
        surname.length >
          10
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Admin tarafından seçilen Wordle oyuncusunun soyadı Wordle kurallarına uygun değil.",
          },
          {
            status: 422,
          },
        );
      }

      selectedPlayer = {
        player_id:
          Number(
            dailyPlayer.player_id,
          ),

        name:
          dailyPlayer.name,

        name_normalized:
          dailyPlayer.name_normalized,

        popularity_score:
          dailyPlayer.popularity_score ===
          null
            ? null
            : Number(
                dailyPlayer.popularity_score,
              ),
      };

      answer =
        surname;
    } else {
      /* ===================================================
         2. NORMAL RANDOM MODE
      =================================================== */

      const {
        count,

        error:
          countError,
      } =
        await supabaseAdmin
          .from(
            "guess_players",
          )
          .select(
            "player_id",
            {
              count:
                "exact",

              head:
                true,
            },
          )
          .eq(
            "is_playable",
            1,
          )
          .gte(
            "popularity_score",
            MINIMUM_POPULARITY_SCORE,
          )
          .not(
            "name_normalized",
            "is",
            null,
          );

      if (
        countError ||
        !count
      ) {
        console.error(
          "Wordle oyuncu sayısı okunamadı:",
          countError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Wordle oyuncu havuzu okunamadı.",
          },
          {
            status: 500,
          },
        );
      }

      for (
        let attempt = 0;
        attempt < 25;
        attempt += 1
      ) {
        const randomIndex =
          Math.floor(
            Math.random() *
              count,
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
              name,
              name_normalized,
              popularity_score
            `)
            .eq(
              "is_playable",
              1,
            )
            .gte(
              "popularity_score",
              MINIMUM_POPULARITY_SCORE,
            )
            .not(
              "name_normalized",
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
              randomIndex,
              randomIndex,
            )
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (
          !data
            ?.name_normalized
        ) {
          continue;
        }

        const surname =
          normalizeSurname(
            data.name_normalized,
          );

        if (
          !/^[A-Z]+$/.test(
            surname,
          )
        ) {
          continue;
        }

        if (
          surname.length <
            4 ||
          surname.length >
            10
        ) {
          continue;
        }

        selectedPlayer = {
          player_id:
            Number(
              data.player_id,
            ),

          name:
            data.name,

          name_normalized:
            data.name_normalized,

          popularity_score:
            data.popularity_score ===
            null
              ? null
              : Number(
                  data.popularity_score,
                ),
        };

        answer =
          surname;

        break;
      }
    }

    /* =====================================================
       3. KONTROL
    ===================================================== */

    if (
      !selectedPlayer ||
      !answer
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Wordle için uygun futbolcu seçilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       4. SESSION
    ===================================================== */

    const {
      data:
        session,

      error:
        sessionError,
    } =
      await supabaseAdmin
        .from(
          "wordle_sessions",
        )
        .insert({
          player_id:
            selectedPlayer
              .player_id,

          answer_normalized:
            answer,

          letter_count:
            answer.length,

          max_attempts:
            MAX_ATTEMPTS,
        })
        .select(`
          id,
          letter_count,
          max_attempts
        `)
        .single();

    if (
      sessionError ||
      !session
    ) {
      console.error(
        "Wordle session oluşturma hatası:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Yeni Wordle oyunu oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       5. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      mode:
        dailyMode
          ? "daily"
          : "random",

      daily:
        dailyMode,

      sessionId:
        session.id,

      letterCount:
        session.letter_count,

      maxAttempts:
        session.max_attempts,

      minimumPopularityScore:
        MINIMUM_POPULARITY_SCORE,
    });
  } catch (error) {
    console.error(
      "Wordle new game endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Yeni oyun hazırlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}