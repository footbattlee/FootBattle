import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 7;
const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_POPULARITY_SCORE = 84;

type CandidatePlayer = {
  player_id: number;

  nationality: string | null;

  position: string | null;

  sub_position: string | null;

  age: number | string | null;

  current_club_name:
    | string
    | null;

  current_competition_id:
    | string
    | null;

  preferred_foot:
    | string
    | null;

  popularity_score:
    | number
    | null;
};

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

function isCompletePlayer(
  player: CandidatePlayer,
) {
  return Boolean(
    player.nationality &&
      player.position &&
      player.age !== null &&
      player.current_club_name &&
      player.current_competition_id &&
      player.preferred_foot,
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

    let targetPlayer:
      | CandidatePlayer
      | null =
      null;

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
            "daily_guess_player",
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
          "Daily Guess The Player okunamadı:",
          dailyError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Guess The Player bilgisi okunamadı.",
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
              "Bugünün Guess The Player oyunu henüz yayınlanmadı.",
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
            nationality,
            position,
            sub_position,
            age,
            current_club_name,
            current_competition_id,
            preferred_foot,
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
        !dailyPlayer
      ) {
        console.error(
          "Daily Guess oyuncusu okunamadı:",
          playerError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Guess The Player oyuncusu bulunamadı.",
          },
          {
            status: 404,
          },
        );
      }

      if (
        !isCompletePlayer(
          dailyPlayer,
        )
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Admin tarafından seçilen Guess The Player oyuncusunun oyun bilgileri eksik.",
          },
          {
            status: 422,
          },
        );
      }

      targetPlayer =
        dailyPlayer;
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
          );

      if (
        countError ||
        !count
      ) {
        console.error(
          "Guess the Player oyuncu sayısı okunamadı:",
          countError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Oyuncu havuzu okunamadı.",
          },
          {
            status: 500,
          },
        );
      }

      for (
        let attempt = 0;
        attempt < 30;
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
              nationality,
              position,
              sub_position,
              age,
              current_club_name,
              current_competition_id,
              preferred_foot,
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
          data &&
          isCompletePlayer(
            data,
          )
        ) {
          targetPlayer =
            data;

          break;
        }
      }
    }

    /* =====================================================
       3. TARGET KONTROL
    ===================================================== */

    if (!targetPlayer) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Guess the Player için uygun oyuncu seçilemedi.",
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
          "guess_player_sessions",
        )
        .insert({
          player_id:
            targetPlayer.player_id,

          max_attempts:
            MAX_ATTEMPTS,
        })
        .select(`
          id,
          max_attempts
        `)
        .single();

    if (
      sessionError ||
      !session
    ) {
      console.error(
        "Guess the Player session oluşturma hatası:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Yeni oyun oluşturulamadı.",
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

      maxAttempts:
        session.max_attempts,

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,

      minimumPopularityScore:
        MINIMUM_POPULARITY_SCORE,

      board: {
        columns: [
          "nationality",
          "club",
          "competition",
          "position",
          "age",
          "preferredFoot",
        ],
      },
    });
  } catch (error) {
    console.error(
      "Guess the Player today endpoint hatası:",
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