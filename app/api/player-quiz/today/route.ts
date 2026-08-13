import { NextResponse } from "next/server";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LIVES = 5;

const GUESS_TIME_SECONDS = 30;

const MINIMUM_SEARCH_LENGTH = 3;

const MINIMUM_POPULARITY_SCORE = 84;

type CandidatePlayer = {
  player_id: number;
  name: string;
  image_url: string | null;
  nationality: string | null;
  popularity_score: number | null;
};

type SelectedCandidateResult = {
  player: CandidatePlayer;
  career: ReturnType<
    typeof buildPlayerQuizSeniorCareer
  >;
};

/* =========================================================
   TURKEY DATE
========================================================= */

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

/* =========================================================
   PLAYER VALIDATION

   Player Quiz için seçilen oyuncunun:
   - doğum yılı
   - milliyeti
   - en az 1 A takım kulübü

   bulunmak zorunda.
========================================================= */

async function prepareCandidate(
  candidate: CandidatePlayer,
): Promise<
  SelectedCandidateResult | null
> {
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
    console.error(
      "Player Quiz candidate hazırlanamadı:",
      {
        playerId:
          candidate.player_id,

        detailError:
          detailResult.error,

        clubsError:
          clubsResult.error,
      },
    );

    return null;
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
    return null;
  }

  if (
    !candidate.nationality
      ?.trim()
  ) {
    return null;
  }

  const seniorCareer =
    buildPlayerQuizSeniorCareer(
      (
        clubsResult.data ??
        []
      ) as RawPlayerQuizClub[],
    );

  if (
    seniorCareer.length <
    1
  ) {
    return null;
  }

  return {
    player:
      candidate,

    career:
      seniorCareer,
  };
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    /* =====================================================
       1. MODE

       ?daily=1
       → admin tarafından yayınlanmış günlük oyuncu

       parametre yok
       → eski random oyun
    ===================================================== */

    const requestUrl =
      new URL(
        request.url,
      );

    const dailyMode =
      requestUrl.searchParams.get(
        "daily",
      ) === "1";

    let selectedPlayer:
      | CandidatePlayer
      | null =
      null;

    let selectedCareer:
      ReturnType<
        typeof buildPlayerQuizSeniorCareer
      > = [];

    /* =====================================================
       2. DAILY MODE
    ===================================================== */

    if (
      dailyMode
    ) {
      const playDate =
        getTurkeyDateKey();

      /* ---------------------------------------------------
         ADMIN TARAFINDAN YAYINLANAN PLAYER QUIZ
      --------------------------------------------------- */

      const {
        data:
          dailyRow,

        error:
          dailyError,
      } =
        await supabaseAdmin
          .from(
            "daily_player_quiz",
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

      if (
        dailyError
      ) {
        console.error(
          "Daily Player Quiz okunamadı:",
          dailyError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Player Quiz bilgisi okunamadı.",
          },
          {
            status: 500,
          },
        );
      }

      if (
        !dailyRow
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Player Quiz'i henüz yayınlanmadı.",
          },
          {
            status: 404,
          },
        );
      }

      /* ---------------------------------------------------
         SEÇİLEN OYUNCU
      --------------------------------------------------- */

      const {
        data:
          dailyPlayer,

        error:
          dailyPlayerError,
      } =
        await supabaseAdmin
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
            "player_id",
            dailyRow.player_id,
          )
          .eq(
            "is_playable",
            1,
          )
          .maybeSingle();

      if (
        dailyPlayerError
      ) {
        console.error(
          "Daily Player Quiz oyuncusu okunamadı:",
          dailyPlayerError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Player Quiz oyuncusu okunamadı.",
          },
          {
            status: 500,
          },
        );
      }

      if (
        !dailyPlayer
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Bugünün Player Quiz oyuncusu bulunamadı.",
          },
          {
            status: 404,
          },
        );
      }

      const prepared =
        await prepareCandidate(
          dailyPlayer as CandidatePlayer,
        );

      if (
        !prepared
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Admin tarafından seçilen Player Quiz oyuncusunun gerekli bilgileri eksik.",
          },
          {
            status: 422,
          },
        );
      }

      selectedPlayer =
        prepared.player;

      selectedCareer =
        prepared.career;
    } else {
      /* ===================================================
         3. NORMAL / RANDOM MODE
      =================================================== */

      const {
        data:
          candidates,

        error:
          candidatesError,
      } =
        await supabaseAdmin
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
              ascending:
                false,

              nullsFirst:
                false,
            },
          );

      if (
        candidatesError
      ) {
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
        candidates.length ===
          0
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

      /* ---------------------------------------------------
         RANDOM BAŞLANGIÇ
      --------------------------------------------------- */

      const randomStart =
        Math.floor(
          Math.random() *
            candidates.length,
        );

      const orderedCandidates:
        CandidatePlayer[] = [
        ...candidates.slice(
          randomStart,
        ),

        ...candidates.slice(
          0,
          randomStart,
        ),
      ];

      /* ---------------------------------------------------
         UYGUN RANDOM OYUNCUYU BUL
      --------------------------------------------------- */

      for (
        const candidate of
          orderedCandidates.slice(
            0,
            100,
          )
      ) {
        const prepared =
          await prepareCandidate(
            candidate,
          );

        if (
          !prepared
        ) {
          continue;
        }

        selectedPlayer =
          prepared.player;

        selectedCareer =
          prepared.career;

        break;
      }
    }

    /* =====================================================
       4. SON KONTROL
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
    ===================================================== */

    const {
      data:
        session,

      error:
        sessionError,
    } =
      await supabaseAdmin
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

      /*
       * Client bunun günlük challenge
       * olup olmadığını da bilir.
       */
      mode:
        dailyMode
          ? "daily"
          : "random",

      daily:
        dailyMode,

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

      minimumPopularityScore:
        MINIMUM_POPULARITY_SCORE,

      board: {
        birthYearSlots:
          1,

        nationalitySlots:
          1,

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
  } catch (
    error
  ) {
    console.error(
      "Player Quiz today endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Yeni Player Quiz hazırlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}