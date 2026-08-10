import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

type ChallengeRow = {
  id: number;
  invite_token: string;
  game_code: string;
  status: string;

  challenger_user_id: string | null;
  challenger_guest_id: string | null;

  opponent_user_id: string | null;
  opponent_guest_id: string | null;
};

const GUEST_COOKIE_NAME =
  "footbattle_guest";

const MINIMUM_SEARCH_LENGTH =
  3;

const MAXIMUM_RESULTS =
  10;

/* =========================================================
   HELPERS
========================================================= */

function sanitizeToken(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .replace(
      /[^a-zA-Z0-9]/g,
      "",
    )
    .slice(
      0,
      64,
    );
}

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /ı/g,
      "i",
    )
    .replace(
      /ç/g,
      "c",
    )
    .replace(
      /ğ/g,
      "g",
    )
    .replace(
      /ö/g,
      "o",
    )
    .replace(
      /ş/g,
      "s",
    )
    .replace(
      /ü/g,
      "u",
    )
    .replace(
      /[^a-z0-9\s'-]/g,
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
  context: RouteContext,
) {
  try {
    /* =====================================================
       TOKEN
    ===================================================== */

    const {
      token: rawToken,
    } =
      await context.params;

    const token =
      sanitizeToken(
        rawToken,
      );

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli challenge bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       QUERY
    ===================================================== */

    const requestUrl =
      new URL(
        request.url,
      );

    const rawQuery =
      requestUrl.searchParams
        .get("q")
        ?.trim() ??
      "";

    const normalizedQuery =
      normalizeText(
        rawQuery,
      );

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
       AUTH / GUEST
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authSupabase.auth.getUser();

    const cookieStore =
      await cookies();

    const guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ??
      null;

    /* =====================================================
       CHALLENGE
    ===================================================== */

    const {
      data:
        challengeData,

      error:
        challengeError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .select(`
          id,
          invite_token,
          game_code,
          status,

          challenger_user_id,
          challenger_guest_id,

          opponent_user_id,
          opponent_guest_id
        `)
        .eq(
          "invite_token",
          token,
        )
        .maybeSingle();

    if (
      challengeError
    ) {
      console.error(
        "Guest Club Clash search challenge sorgu hatası:",
        challengeError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !challengeData
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    /* =====================================================
       ACCESS
    ===================================================== */

    const isChallenger =
      user
        ? challenge
            .challenger_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .challenger_guest_id ===
                guestId,
          );

    const isOpponent =
      user
        ? challenge
            .opponent_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .opponent_guest_id ===
                guestId,
          );

    if (
      !isChallenger &&
      !isOpponent
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge'a erişim yetkin yok.",
        },
        {
          status: 403,
        },
      );
    }

    const role:
      | "challenger"
      | "opponent" =
      isChallenger
        ? "challenger"
        : "opponent";

    /* =====================================================
       GAME CONTROL
    ===================================================== */

    if (
      challenge.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge 2 Takım 1 Oyuncu değil.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      challenge.status !==
      "playing"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncu araması yalnızca aktif düelloda yapılabilir.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       CURRENT ROUND CONTROL

       Challenge hazırlanmış mı kontrol ediyoruz.
       Arama sadece aktif bir round varsa çalışsın.
    ===================================================== */

    const {
      data:
        currentRound,

      error:
        roundError,
    } =
      await supabaseAdmin
        .from(
          "challenge_rounds",
        )
        .select(`
          id,
          round_no,
          completed_at
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .eq(
          "game_code",
          "club_clash",
        )
        .is(
          "completed_at",
          null,
        )
        .order(
          "round_no",
          {
            ascending:
              true,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      roundError
    ) {
      console.error(
        "Guest Club Clash current round sorgu hatası:",
        roundError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Aktif round okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !currentRound
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Aktif round bulunamadı.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       SEARCH

       name_normalized içinde arıyoruz.
       Örnek:
       sne  -> Wesley Sneijder
       snej -> Sneijder

       "%" ve "_" wildcardlarını temizliyoruz.
    ===================================================== */

    const safeQuery =
      normalizedQuery
        .replace(
          /%/g,
          "",
        )
        .replace(
          /_/g,
          "",
        );

    const {
      data:
        players,

      error:
        searchError,
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
          image_url,
          popularity_score
        `)
        .eq(
          "is_playable",
          1,
        )
        .ilike(
          "name_normalized",
          `%${safeQuery}%`,
        )
        .order(
          "popularity_score",
          {
            ascending:
              false,

            nullsFirst:
              false,
          },
        )
        .order(
          "name",
          {
            ascending:
              true,
          },
        )
        .limit(
          MAXIMUM_RESULTS,
        );

    if (
      searchError
    ) {
      console.error(
        "Guest Club Clash player search hatası:",
        searchError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncular aranamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      role,

      query:
        rawQuery,

      normalizedQuery,

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,

      players:
        (
          players ??
          []
        ).map(
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
              player
                .current_club_name ??
              null,

            imageUrl:
              player.image_url ??
              null,

            popularityScore:
              player
                .popularity_score ===
              null
                ? null
                : Number(
                    player
                      .popularity_score,
                  ),
          }),
        ),
    });
  } catch (error) {
    console.error(
      "Guest Club Clash search-player endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

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