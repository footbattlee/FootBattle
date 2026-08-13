import { NextResponse } from "next/server";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LIVES = 5;
const GUESS_TIME_SECONDS = 30;
const MINIMUM_SEARCH_LENGTH = 3;

export async function GET() {
  try {
    /* =====================================================
       1. AKTİF TRANSFER QUIZ
    ===================================================== */

    const {
      data: transferQuiz,
      error: transferError,
    } = await supabaseAdmin
      .from("transfer_quizzes")
      .select(`
        id,
        player_id,
        headline,
        club_name,
        created_at
      `)
      .eq("is_active", true)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (transferError) {
      console.error(
        "Transfer Quiz aktif kayıt okunamadı:",
        transferError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Aktif transfer quiz okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (!transferQuiz) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Aktif transfer quiz bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const playerId =
      Number(
        transferQuiz.player_id,
      );

    /* =====================================================
       2. OYUNCU + DETAY + KARİYER
    ===================================================== */

    const [
      playerResult,
      detailResult,
      clubsResult,
    ] =
      await Promise.all([
        supabaseAdmin
          .from("guess_players")
          .select(`
            player_id,
            name,
            image_url,
            nationality,
            popularity_score
          `)
          .eq(
            "player_id",
            playerId,
          )
          .maybeSingle(),

        supabaseAdmin
          .from(
            "player_quiz_details",
          )
          .select(
            "birth_year",
          )
          .eq(
            "player_id",
            playerId,
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
            playerId,
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
      playerResult.error ||
      !playerResult.data
    ) {
      console.error(
        "Transfer Quiz oyuncu okunamadı:",
        playerResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Transfer Quiz oyuncusu bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      detailResult.error ||
      !detailResult.data
    ) {
      console.error(
        "Transfer Quiz oyuncu detayı okunamadı:",
        detailResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun doğum yılı bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    if (clubsResult.error) {
      console.error(
        "Transfer Quiz kariyer okunamadı:",
        clubsResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun kariyer bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const seniorCareer =
      buildPlayerQuizSeniorCareer(
        (
          clubsResult.data ??
          []
        ) as RawPlayerQuizClub[],
      );

    if (
      seniorCareer.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun A takım kariyeri bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       3. SESSION

       Transfer Quiz de mevcut player_quiz_sessions
       altyapısını kullanıyor.
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
          playerId,

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
        "Transfer Quiz session oluşturulamadı:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Transfer Quiz oturumu oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       4. TÜRKÇE MİLLİYET GÖSTERİMİ
    ===================================================== */

    let nationalityTr:
      string | null =
      null;

    const dbNationality =
      playerResult.data
        .nationality?.trim();

    if (dbNationality) {
      const {
        data: countryRow,
      } =
        await supabaseAdmin
          .from(
            "challenge_countries",
          )
          .select(
            "country_name",
          )
          .eq(
            "nationality_db_value",
            dbNationality,
          )
          .maybeSingle();

      nationalityTr =
        countryRow
          ?.country_name ??
        dbNationality;
    }

    /* =====================================================
       5. RESPONSE

       Player Quiz page yapısına uyumlu +
       transfer alanları.
    ===================================================== */

    return NextResponse.json({
      ok: true,

      transferQuizId:
        transferQuiz.id,

      headline:
        transferQuiz.headline ??
        "Transfer Özel",

      targetClub:
        transferQuiz.club_name ??
        null,

      sessionId:
        session.id,

      player: {
        id:
          Number(
            playerResult.data
              .player_id,
          ),

        fullName:
          playerResult.data.name,

        imageUrl:
          playerResult.data
            .image_url ??
          null,

        nationality:
          nationalityTr,
      },

      maxLives:
        session.max_lives,

      guessTimeSeconds:
        session.guess_time_seconds,

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,

      board: {
        birthYearSlots: 1,
        nationalitySlots: 1,
        clubSlots:
          seniorCareer.length,

        totalSlots:
          seniorCareer.length +
          2,
      },

      scoring: {
        completionScore: 500,
      },
    });
  } catch (error) {
    console.error(
      "Transfer Quiz today endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Transfer Quiz hazırlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}
