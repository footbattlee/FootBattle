import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 7;
const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_POPULARITY_SCORE = 82;

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

export async function GET() {
  try {
    /* =====================================================
       1. PLAYABLE + BİLİNİRLİĞİ YETERLİ OYUNCU SAYISI
    ===================================================== */

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
          status:
            500,
        },
      );
    }

    /* =====================================================
       2. RANDOM UYGUN OYUNCU
    ===================================================== */

    let targetPlayer:
      | CandidatePlayer
      | null =
      null;

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

      if (
        error
      ) {
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

    if (
      !targetPlayer
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Guess the Player için uygun oyuncu seçilemedi.",
        },
        {
          status:
            500,
        },
      );
    }

    /* =====================================================
       3. SESSION OLUŞTUR
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
          status:
            500,
        },
      );
    }

    /* =====================================================
       4. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

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
  } catch (
    error
  ) {
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
        status:
          500,
      },
    );
  }
}