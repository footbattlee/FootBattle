import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_WRONG_GUESSES = 5;

const SCORE_TABLE = [
  250,
  200,
  150,
  100,
  50,
  0,
];

type FinishReason =
  | "won"
  | "lost";

type ResultRequest = {
  sessionId?: string;

  finishReason?: FinishReason;

  solvedClubIds?: number[];

  wrongCount?: number;

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
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   YOUTH / RESERVE FILTER
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
      "football",
      "club",
      "futbol",
      "futebol",
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

    const wrongCount =
      Number(
        body.wrongCount,
      );

    if (
      !Number.isInteger(
        wrongCount,
      ) ||
      wrongCount < 0 ||
      wrongCount >
        MAX_WRONG_GUESSES
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Yanlış tahmin sayısı geçersiz.",
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
        "career_path_sessions",
      )
      .select(`
        id,
        player_id,
        max_wrong_guesses,
        completed,
        result_applied,
        won,
        score,
        wrong_count,
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
        "Career Path session okunamadı:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Career Path oyunu kontrol edilemedi.",
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
            "Career Path oyunu bulunamadı.",
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
       4. RAW CAREER
    ===================================================== */

    const {
      data: rawClubs,
      error: clubsError,
    } = await supabaseAdmin
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
      );

    if (clubsError) {
      console.error(
        "Career Path kulüpleri okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kariyer bilgileri doğrulanamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !rawClubs ||
      rawClubs.length ===
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun kariyer kulüpleri bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       5. CLEAN SENIOR CAREER
    ===================================================== */

    const seniorCareer =
      buildSeniorCareer(
        rawClubs,
      );

    if (
      seniorCareer.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun A takım kariyer kulüpleri bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const targetClubIds =
      new Set(
        seniorCareer.map(
          (
            club,
          ) =>
            club.id,
        ),
      );

    /* =====================================================
       6. SUBMITTED IDS VALID?
    ===================================================== */

    const submittedClubsAreValid =
      solvedClubIds.every(
        (
          clubId,
        ) =>
          targetClubIds.has(
            clubId,
          ),
      );

    if (
      !submittedClubsAreValid
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Gönderilen kulüp bilgilerinden biri bu oyuncunun A takım kariyerine ait değil.",
        },
        {
          status: 400,
        },
      );
    }

    const allClubsSolved =
      solvedClubIds.length ===
      targetClubIds.size;

    /* =====================================================
       7. WIN VALIDATION
    ===================================================== */

    const won =
      allClubsSolved &&
      wrongCount <
        session.max_wrong_guesses;

    if (
      body.finishReason ===
        "won" &&
      !won
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Career Path tamamlanmış görünmüyor. Eksik A takım kulübü var.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.finishReason ===
        "lost" &&
      wrongCount <
        session.max_wrong_guesses
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyun henüz kaybedilmiş görünmüyor.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       8. SCORE
    ===================================================== */

    const score =
      won
        ? SCORE_TABLE[
            Math.min(
              wrongCount,
              5,
            )
          ] ?? 0
        : 0;

    /* =====================================================
       9. PLAYER
    ===================================================== */

    const {
      data: targetPlayer,
      error:
        targetPlayerError,
    } = await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(`
        player_id,
        name,
        image_url
      `)
      .eq(
        "player_id",
        playerId,
      )
      .maybeSingle();

    if (
      targetPlayerError
    ) {
      console.error(
        "Career Path oyuncusu okunamadı:",
        targetPlayerError,
      );
    }

    /* =====================================================
       10. ALREADY APPLIED
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

        wrongCount:
          session.wrong_count ??
          wrongCount,

        attemptCount:
          session.attempt_count ??
          attemptCount,

        player: targetPlayer
          ? {
              id:
                Number(
                  targetPlayer.player_id,
                ),

              fullName:
                targetPlayer.name,

              imageUrl:
                targetPlayer.image_url ??
                null,
            }
          : null,

        allClubs:
          seniorCareer,
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
        "career_path_sessions",
      )
      .update({
        completed:
          true,

        result_applied:
          true,

        won,

        score,

        wrong_count:
          wrongCount,

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
        "Career Path session tamamlama hatası:",
        completeError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Career Path sonucu kaydedilemedi.",
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

        wrongCount,

        attemptCount,

        player: targetPlayer
          ? {
              id:
                Number(
                  targetPlayer.player_id,
                ),

              fullName:
                targetPlayer.name,

              imageUrl:
                targetPlayer.image_url ??
                null,
            }
          : null,

        allClubs:
          seniorCareer,
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
        "Career Path profil okunamadı:",
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
        "Career Path profil güncelleme hatası:",
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

      wrongCount,

      attemptCount,

      alreadyRecorded:
        false,

      player: targetPlayer
        ? {
            id:
              Number(
                targetPlayer.player_id,
              ),

            fullName:
              targetPlayer.name,

            imageUrl:
              targetPlayer.image_url ??
              null,
          }
        : null,

      /*
       * Kaybedince page.tsx sadece A takım
       * kariyerini açar.
       */
      allClubs:
        seniorCareer,

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
      "Career Path result endpoint hatası:",
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