import { NextResponse } from "next/server";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LIVES = 5;

const GUESS_TIME_SECONDS = 30;

const MINIMUM_SEARCH_LENGTH = 3;

const MINIMUM_POPULARITY_SCORE = 72;

type CandidatePlayer = {
  player_id: number;
  name: string;
  image_url: string | null;
  nationality: string | null;
  popularity_score: number | null;
};

export async function GET() {
  try {
    /* =====================================================
       1. ADAY HAVUZU
    ===================================================== */

    const {
      data: candidates,
      error: candidatesError,
    } = await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(`
        player_id,
        name,
        image_url,
        nationality,
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
        "nationality",
        "is",
        null,
      )
      .order(
        "popularity_score",
        {
          ascending: false,
          nullsFirst: false,
        },
      );

    if (candidatesError) {
      console.error(
        "Player Quiz oyuncu havuzu okunamadı:",
        candidatesError,
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

    if (
      !candidates ||
      candidates.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Player Quiz için uygun oyuncu bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       2. RANDOM BAŞLANGIÇ

       sort(Math.random) yerine daha düzgün ve ucuz.
    ===================================================== */

    const randomStart =
      Math.floor(
        Math.random() *
          candidates.length,
      );

    const orderedCandidates: CandidatePlayer[] =
      [
        ...candidates.slice(
          randomStart,
        ),

        ...candidates.slice(
          0,
          randomStart,
        ),
      ];

    let selectedPlayer:
      | CandidatePlayer
      | null = null;

    let selectedCareer:
      ReturnType<
        typeof buildPlayerQuizSeniorCareer
      > = [];

    /* =====================================================
       3. UYGUN OYUNCUYU BUL
    ===================================================== */

    for (
      const candidate of
        orderedCandidates.slice(
          0,
          100,
        )
    ) {
      const [
        detailResult,
        clubsResult,
      ] =
        await Promise.all([
          supabaseAdmin
            .from(
              "player_quiz_details",
            )
            .select(
              "birth_year",
            )
            .eq(
              "player_id",
              candidate.player_id,
            )
            .maybeSingle(),

          supabaseAdmin
            .from(
              "player_quiz_clubs",
            )
            .select(`
              id,
              club_name,
              career_order
            `)
            .eq(
              "player_id",
              candidate.player_id,
            )
            .not(
              "club_name",
              "is",
              null,
            )
            .order(
              "career_order",
              {
                ascending: true,
              },
            ),
        ]);

      if (
        detailResult.error ||
        clubsResult.error
      ) {
        continue;
      }

      const birthYear =
        Number(
          detailResult.data
            ?.birth_year ??
            0,
        );

      if (
        !Number.isInteger(
          birthYear,
        ) ||
        birthYear < 1900 ||
        birthYear > 2100
      ) {
        continue;
      }

      if (
        !candidate.nationality
          ?.trim()
      ) {
        continue;
      }

      const seniorCareer =
        buildPlayerQuizSeniorCareer(
          (
            clubsResult.data ??
            []
          ) as RawPlayerQuizClub[],
        );

      /*
       * En az bir gerçek A takım kulübü.
       */
      if (
        seniorCareer.length <
        1
      ) {
        continue;
      }

      selectedPlayer =
        candidate;

      selectedCareer =
        seniorCareer;

      break;
    }

    /* =====================================================
       4. BULUNAMADI
    ===================================================== */

    if (
      !selectedPlayer ||
      selectedCareer.length ===
        0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Player Quiz için gerekli bilgileri tamamlanmış uygun oyuncu seçilemedi.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       5. SESSION

       30 SANİYE BURAYA DA YAZILIYOR.
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from(
        "player_quiz_sessions",
      )
      .insert({
        player_id:
          selectedPlayer.player_id,

        max_lives:
          MAX_LIVES,

        guess_time_seconds:
          GUESS_TIME_SECONDS,
      })
      .select(`
        id,
        max_lives,
        guess_time_seconds
      `)
      .single();

    if (
      sessionError ||
      !session
    ) {
      console.error(
        "Player Quiz session oluşturulamadı:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Yeni Player Quiz oyunu oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       6. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      sessionId:
        session.id,

      player: {
        id:
          Number(
            selectedPlayer.player_id,
          ),

        fullName:
          selectedPlayer.name,

        imageUrl:
          selectedPlayer.image_url ??
          null,
      },

      maxLives:
        session.max_lives,

      guessTimeSeconds:
        session.guess_time_seconds,

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,

      board: {
        birthYearSlots:
          1,

        nationalitySlots:
          1,

        /*
         * KRİTİK:
         * ham DB satır sayısı değil.
         */
        clubSlots:
          selectedCareer.length,

        totalSlots:
          selectedCareer.length +
          2,
      },

      scoring: {
        completionScore:
          500,
      },
    });
  } catch (error) {
    console.error(
      "Player Quiz today endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Yeni Player Quiz hazırlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}