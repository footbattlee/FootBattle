import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";

import { supabaseAdmin } from "@/lib/supabase/server";

const COMPLETION_SCORE = 500;

type FinishReason =
  | "won"
  | "lost";

type ResultRequest = {
  sessionId?: string;

  finishReason?: FinishReason;

  birthYear?:
    | string
    | number;

  nationality?: string;

  solvedClubIds?: number[];

  attemptCount?: number;
};

function normalizeNationality(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       1. AUTH
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: { user },
    } =
      await authClient.auth.getUser();

    /*
     * Girişsiz kullanıcı da oyunu bitirebilsin.
     * Profil puanı yalnızca login varsa işlenir.
     */

    /* =====================================================
       2. BODY
    ===================================================== */

    const body =
      (await request.json()) as ResultRequest;

    const sessionId =
      body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyun oturumu bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.finishReason !==
        "won" &&
      body.finishReason !==
        "lost"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyun bitiş bilgisi geçersiz.",
        },
        {
          status: 400,
        },
      );
    }

    const solvedClubIds =
      Array.isArray(
        body.solvedClubIds,
      )
        ? Array.from(
            new Set(
              body.solvedClubIds
                .map(Number)
                .filter(
                  (id) =>
                    Number.isInteger(
                      id,
                    ) &&
                    id > 0,
                ),
            ),
          )
        : [];

    const attemptCount =
      typeof body.attemptCount ===
        "number" &&
      Number.isInteger(
        body.attemptCount,
      ) &&
      body.attemptCount >= 0
        ? body.attemptCount
        : 0;

    /* =====================================================
       3. SESSION
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from(
        "player_quiz_sessions",
      )
      .select(`
        id,
        player_id,
        completed,
        result_applied,
        won,
        score,
        attempt_count
      `)
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

    if (
      sessionError ||
      !session
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Transfer Quiz oturumu bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const playerId =
      Number(
        session.player_id,
      );

    /* =====================================================
       4. GERÇEK CEVAPLAR
    ===================================================== */

    const [
      detailResult,
      playerResult,
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
            playerId,
          )
          .maybeSingle(),

        supabaseAdmin
          .from(
            "guess_players",
          )
          .select(`
            player_id,
            name,
            image_url,
            nationality
          `)
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
      detailResult.error ||
      !detailResult.data ||
      playerResult.error ||
      !playerResult.data ||
      clubsResult.error
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun doğru cevapları okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const player =
      playerResult.data;

    const seniorCareer =
      buildPlayerQuizSeniorCareer(
        (
          clubsResult.data ??
          []
        ) as RawPlayerQuizClub[],
      );

    /* =====================================================
       5. TÜRKÇE MİLLİYET
    ===================================================== */

    const dbNationality =
      player.nationality?.trim() ??
      "";

    const {
      data: countryRow,
    } =
      dbNationality
        ? await supabaseAdmin
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
            .maybeSingle()
        : {
            data: null,
          };

    const nationalityTr =
      countryRow
        ?.country_name ??
      dbNationality;

    const birthYearCorrect =
      Number(
        body.birthYear,
      ) ===
      Number(
        detailResult.data
          .birth_year,
      );

    const userNationality =
      normalizeNationality(
        body.nationality,
      );

    const nationalityCorrect =
      Boolean(
        userNationality,
      ) &&
      (
        userNationality ===
          normalizeNationality(
            dbNationality,
          ) ||
        userNationality ===
          normalizeNationality(
            nationalityTr,
          )
      );

    const targetClubIds =
      new Set(
        seniorCareer.map(
          (club) =>
            club.id,
        ),
      );

    const submittedValid =
      solvedClubIds.every(
        (id) =>
          targetClubIds.has(
            id,
          ),
      );

    if (!submittedValid) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Gönderilen kulüplerden biri oyuncunun A takım kariyerine ait değil.",
        },
        {
          status: 400,
        },
      );
    }

    const allClubsSolved =
      targetClubIds.size >
        0 &&
      solvedClubIds.length ===
        targetClubIds.size;

    const won =
      birthYearCorrect &&
      nationalityCorrect &&
      allClubsSolved;

    if (
      body.finishReason ===
        "won" &&
      !won
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Transfer Quiz tamamlanmış görünmüyor.",
        },
        {
          status: 400,
        },
      );
    }

    const score =
      won
        ? COMPLETION_SCORE
        : 0;

    const correctAnswers = {
      birthYear:
        Number(
          detailResult.data
            .birth_year,
        ),

      nationality:
        nationalityTr,

      clubs:
        seniorCareer,
    };

    /* =====================================================
       6. ZATEN KAYDEDİLDİ
    ===================================================== */

    if (
      session.result_applied
    ) {
      return NextResponse.json({
        ok: true,

        alreadyRecorded:
          true,

        won:
          session.won,

        score:
          session.score ??
          0,

        attemptCount:
          session.attempt_count ??
          attemptCount,

        player: {
          id:
            Number(
              player.player_id,
            ),

          fullName:
            player.name,

          imageUrl:
            player.image_url ??
            null,
        },

        correctAnswers,
      });
    }

    /* =====================================================
       7. SESSION LOCK
    ===================================================== */

    const {
      data: completedSession,
      error: completeError,
    } =
      await supabaseAdmin
        .from(
          "player_quiz_sessions",
        )
        .update({
          completed:
            true,

          result_applied:
            true,

          won,

          score,

          attempt_count:
            attemptCount,

          user_id:
            user?.id ??
            null,

          completed_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          sessionId,
        )
        .eq(
          "result_applied",
          false,
        )
        .select(
          "id",
        )
        .maybeSingle();

    if (completeError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Transfer Quiz sonucu kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    if (!completedSession) {
      return NextResponse.json({
        ok: true,

        alreadyRecorded:
          true,

        won,
        score,
        attemptCount,
        correctAnswers,
      });
    }

    /* =====================================================
       8. LOGIN YOKSA BURADA BİTİR
    ===================================================== */

    if (!user) {
      return NextResponse.json({
        ok: true,

        won,
        score,
        attemptCount,

        alreadyRecorded:
          false,

        correctAnswers,

        profileUpdated:
          false,
      });
    }

    /* =====================================================
       9. PROFILE
    ===================================================== */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from(
          "profiles",
        )
        .select(`
          id,
          total_score,
          games_played,
          games_won,
          current_streak,
          best_streak
        `)
        .eq(
          "id",
          user.id,
        )
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json({
        ok: true,

        won,
        score,
        attemptCount,

        alreadyRecorded:
          false,

        correctAnswers,

        profileUpdated:
          false,
      });
    }

    const nextTotalScore =
      (
        profile.total_score ??
        0
      ) +
      score;

    const nextGamesPlayed =
      (
        profile.games_played ??
        0
      ) +
      1;

    const nextGamesWon =
      (
        profile.games_won ??
        0
      ) +
      (
        won
          ? 1
          : 0
      );

    const {
      error:
        profileUpdateError,
    } =
      await supabaseAdmin
        .from(
          "profiles",
        )
        .update({
          total_score:
            nextTotalScore,

          games_played:
            nextGamesPlayed,

          games_won:
            nextGamesWon,
        })
        .eq(
          "id",
          user.id,
        );

    if (
      profileUpdateError
    ) {
      console.error(
        "Transfer Quiz profil güncelleme hatası:",
        profileUpdateError,
      );
    }

    return NextResponse.json({
      ok: true,

      won,
      score,
      attemptCount,

      alreadyRecorded:
        false,

      correctAnswers,

      currentStreak:
        profile.current_streak ??
        0,

      bestStreak:
        profile.best_streak ??
        0,

      totalScore:
        nextTotalScore,

      gamesPlayed:
        nextGamesPlayed,

      gamesWon:
        nextGamesWon,

      profileUpdated:
        !profileUpdateError,
    });
  } catch (error) {
    console.error(
      "Transfer Quiz result endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}
