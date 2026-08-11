import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   SETTINGS
========================================================= */

const MINIMUM_SEARCH_LENGTH = 3;

const RESULT_LIMIT = 10;

/* =========================================================
   NORMALIZE
========================================================= */

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /ı/g,
      "i",
    )
    .replace(
      /[^a-z0-9\s-]/g,
      "",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const rawQuery =
      searchParams.get(
        "q",
      ) ?? "";

    const normalizedQuery =
      normalizeText(
        rawQuery,
      );

    /* =====================================================
       MIN LENGTH
    ===================================================== */

    if (
      normalizedQuery.length <
      MINIMUM_SEARCH_LENGTH
    ) {
      return NextResponse.json({
        ok: true,

        players: [],

        minimumSearchLength:
          MINIMUM_SEARCH_LENGTH,
      });
    }

    /* =====================================================
       SEARCH

       %query%
       İsmin herhangi bir yerinde geçebilir.

       Örnek:
       Lionel Messi

       mes -> bulur
       ssi -> bulur
       nel -> bulur
    ===================================================== */

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
          nationality,
          current_club_name,
          image_url
        `)
        .ilike(
          "name_normalized",
          `%${normalizedQuery}%`,
        )
        .limit(
          50,
        );

    if (error) {
      console.error(
        "1 Takım 1 Millet oyuncu arama hatası:",
        error,
      );

      throw error;
    }

    /* =====================================================
       RANKING

       1. Tam eşleşme
       2. İsim query ile başlıyor
       3. Bir kelime query ile başlıyor
       4. İsmin herhangi bir yerinde geçiyor
    ===================================================== */

    const rankedPlayers =
      (
        data ??
        []
      )
        .map(
          (
            player,
          ) => {
            const normalizedName =
              normalizeText(
                player.name_normalized ??
                  player.name ??
                  "",
              );

            const nameParts =
              normalizedName
                .split(
                  " ",
                )
                .filter(
                  Boolean,
                );

            let rank =
              4;

            if (
              normalizedName ===
              normalizedQuery
            ) {
              rank =
                1;
            } else if (
              normalizedName.startsWith(
                normalizedQuery,
              )
            ) {
              rank =
                2;
            } else if (
              nameParts.some(
                (
                  part,
                ) =>
                  part.startsWith(
                    normalizedQuery,
                  ),
              )
            ) {
              rank =
                3;
            }

            return {
              ...player,

              rank,
            };
          },
        )
        .sort(
          (
            first,
            second,
          ) => {
            if (
              first.rank !==
              second.rank
            ) {
              return (
                first.rank -
                second.rank
              );
            }

            return (
              first.name ??
              ""
            ).localeCompare(
              second.name ??
                "",
              "tr",
            );
          },
        )
        .slice(
          0,
          RESULT_LIMIT,
        );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,

      players:
        rankedPlayers.map(
          (
            player,
          ) => ({
            playerId:
              Number(
                player.player_id,
              ),

            name:
              player.name,

            nationality:
              player.nationality ??
              null,

            currentClubName:
              player.current_club_name ??
              null,

            imageUrl:
              player.image_url ??
              null,
          }),
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "1 Takım 1 Millet search-player endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        players: [],

        error:
          error instanceof Error
            ? error.message
            : "Oyuncular aranamadı.",
      },
      {
        status: 500,
      },
    );
  }
}