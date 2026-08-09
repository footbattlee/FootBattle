import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const COMPLETION_SCORE = 500;

type FinishReason =
  | "won"
  | "lost";

type ResultRequest = {
  sessionId?: string;
  finishReason?: FinishReason;
  birthYear?: string | number;
  nationality?: string;
  solvedClubIds?: number[];
  attemptCount?: number;
};

type RawCareerClub = {
  id: number;
  club_name: string;
  career_order: number | null;
};

/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/&/g, " ")
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   YOUTH FILTER
========================================================= */

function isYouthClubName(value: unknown) {
  const clubName =
    normalizeText(value);

  if (!clubName) {
    return true;
  }

  return (
    /\bu\s?\d{2}\b/.test(clubName) ||
    /\byth\b/.test(clubName) ||
    /\byouth\b/.test(clubName) ||
    /\bacademy\b/.test(clubName) ||
    /\bakademi\b/.test(clubName) ||
    /\breserve\b/.test(clubName) ||
    /\breserves\b/.test(clubName) ||
    /\bprimavera\b/.test(clubName) ||
    /\bjuvenil\b/.test(clubName) ||
    /\bjuniors?\b/.test(clubName)
  );
}

/* =========================================================
   CLUB NORMALIZATION
========================================================= */

function normalizeClubName(value: unknown) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return "";
  }

  const removableWords =
    new Set([
      "fc",
      "afc",
      "cf",
      "sc",
      "sk",
      "fk",
      "ac",
      "jk",
      "football",
      "club",
      "futbol",
      "futebol",
      "calcio",
    ]);

  return normalized
    .split(" ")
    .filter(
      (word) =>
        word &&
        !removableWords.has(
          word,
        ),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   BUILD SENIOR CAREER
========================================================= */

function buildSeniorCareer(
  rawClubs: RawCareerClub[],
) {
  const seniorClubs =
    rawClubs.filter(
      (club) =>
        !isYouthClubName(
          club.club_name,
        ),
    );

  const sortedClubs =
    [...seniorClubs].sort(
      (
        first,
        second,
      ) =>
        Number(
          first.career_order ??
            999999,
        ) -
        Number(
          second.career_order ??
            999999,
        ),
    );

  const uniqueClubMap =
    new Map<
      string,
      {
        id: number;
        name: string;
        originalOrder: number;
      }
    >();

  for (
    const club of
      sortedClubs
  ) {
    const normalized =
      normalizeClubName(
        club.club_name,
      );

    if (!normalized) {
      continue;
    }

    if (
      uniqueClubMap.has(
        normalized,
      )
    ) {
      continue;
    }

    uniqueClubMap.set(
      normalized,
      {
        id:
          Number(
            club.id,
          ),

        name:
          club.club_name,

        originalOrder:
          Number(
            club.career_order ??
              0,
          ),
      },
    );
  }

  return Array.from(
    uniqueClubMap.values(),
  )
    .sort(
      (
        first,
        second,
      ) =>
        first.originalOrder -
        second.originalOrder,
    )
    .map(
      (
        club,
        index,
      ) => ({
        id:
          club.id,

        name:
          club.name,

        careerOrder:
          index + 1,
      }),
    );
}

/* =========================================================
   POST
========================================================= */

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
      error: userError,
    } =
      await authClient.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sonucu kaydetmek için giriş yapmalısın.",
        },
        {
          status: 401,
        },
      );
    }

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

    const attemptCount =
      typeof body.attemptCount ===
        "number" &&
      Number.isInteger(
        body.attemptCount,
      ) &&
      body.attemptCount >=
        0
        ? body.attemptCount
        : 0;

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
        max_lives,
        guess_time_seconds,
        completed,
        result_applied,
        won,
        score,
        attempt_count,
        user_id
      `)
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

    if (sessionError) {
      console.error(
        "Player Quiz session okunamadı:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Player Quiz oturumu kontrol edilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Player Quiz oyunu bulunamadı.",
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
       4. GERÇEK CEVAPLARI OKU
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
      !detailResult.data
    ) {
      console.error(
        "Player Quiz doğum yılı okunamadı:",
        detailResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun doğum yılı okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      playerResult.error ||
      !playerResult.data
    ) {
      console.error(
        "Player Quiz oyuncusu okunamadı:",
        playerResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncu bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      clubsResult.error
    ) {
      console.error(
        "Player Quiz kulüpleri okunamadı:",
        clubsResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kulüp bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const player =
      playerResult.data;

    const seniorCareer =
      buildSeniorCareer(
        clubsResult.data ??
          [],
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
       5. BIRTH YEAR VALIDATION
    ===================================================== */

    const birthYearCorrect =
      Number(
        body.birthYear,
      ) ===
      Number(
        detailResult.data
          .birth_year,
      );

    /* =====================================================
       6. NATIONALITY VALIDATION
    ===================================================== */

    const nationalityCorrect =
      normalizeText(
        body.nationality,
      ) ===
      normalizeText(
        player.nationality,
      );

    /* =====================================================
       7. CLUB VALIDATION
    ===================================================== */

    const targetClubIds =
      new Set(
        seniorCareer.map(
          (club) =>
            club.id,
        ),
      );

    const submittedClubsAreValid =
      solvedClubIds.every(
        (id) =>
          targetClubIds.has(
            id,
          ),
      );

    if (
      !submittedClubsAreValid
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Gönderilen kulüp bilgilerinden biri oyuncunun A takım kariyerine ait değil.",
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

    /* =====================================================
       8. REAL RESULT

       TROPHY ARTIK YOK.
    ===================================================== */

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
            "Player Quiz tamamlanmış görünmüyor. Eksik veya yanlış cevap var.",
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

    /* =====================================================
       9. DOĞRU CEVAPLAR

       Kaybedince frontend gösterebilir.
    ===================================================== */

    const correctAnswers = {
      birthYear:
        Number(
          detailResult.data
            .birth_year,
        ),

      nationality:
        player.nationality,

      clubs:
        seniorCareer,
    };

    /* =====================================================
       10. ALREADY RECORDED
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
       11. COMPLETE SESSION
    ===================================================== */

    const now =
      new Date().toISOString();

    const {
      data: completedSession,
      error: completeError,
    } = await supabaseAdmin
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
          user.id,

        completed_at:
          now,
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

    if (
      completeError
    ) {
      console.error(
        "Player Quiz session tamamlama hatası:",
        completeError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Player Quiz sonucu kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       12. RACE CONDITION
    ===================================================== */

    if (!completedSession) {
      return NextResponse.json({
        ok: true,

        alreadyRecorded:
          true,

        won,

        score,

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
       13. PROFILE
    ===================================================== */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
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
      console.error(
        "Player Quiz profil okunamadı:",
        profileError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kullanıcı profili okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const nextTotalScore =
      (profile.total_score ??
        0) +
      score;

    const nextGamesPlayed =
      (profile.games_played ??
        0) +
      1;

    const nextGamesWon =
      (profile.games_won ??
        0) +
      (won ? 1 : 0);

    const {
      error:
        profileUpdateError,
    } = await supabaseAdmin
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
        "Player Quiz profil güncelleme hatası:",
        profileUpdateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kullanıcı istatistikleri güncellenemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       14. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      won,

      score,

      attemptCount,

      alreadyRecorded:
        false,

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
    });
  } catch (error) {
    console.error(
      "Player Quiz result endpoint hatası:",
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