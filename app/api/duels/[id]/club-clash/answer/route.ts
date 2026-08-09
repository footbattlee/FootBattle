import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AnswerBody = {
  playerId?: number | null;
  answer?: string;
};

type GuessPlayer = {
  player_id: number;
  name: string;
  name_normalized: string | null;
  current_club_name: string | null;
};

/* =========================================================
   SETTINGS
========================================================= */

const WIN_SCORE = 3;

/* =========================================================
   NORMALIZE
========================================================= */

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
}

/* =========================================================
   OYUNCUYU ÇÖZ
========================================================= */

async function resolvePlayer(
  playerId: number | null,
  rawAnswer: string,
) {
  /* -------------------------------------------------------
     1. AUTOCOMPLETE PLAYER ID
  ------------------------------------------------------- */

  if (
    playerId &&
    Number.isInteger(playerId) &&
    playerId > 0
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("guess_players")
      .select(`
        player_id,
        name,
        name_normalized,
        current_club_name
      `)
      .eq(
        "player_id",
        playerId,
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        ok: false as const,

        status: 404,

        error:
          "Seçilen futbolcu bulunamadı.",
      };
    }

    return {
      ok: true as const,

      player:
        data as GuessPlayer,
    };
  }

  /* -------------------------------------------------------
     2. SERBEST METİN
  ------------------------------------------------------- */

  const normalizedAnswer =
    normalizeText(rawAnswer);

  if (
    normalizedAnswer.length < 2
  ) {
    return {
      ok: false as const,

      status: 400,

      error:
        "Futbolcu adı veya soyadı yazmalısın.",
    };
  }

  /* -------------------------------------------------------
     3. TAM İSİM
  ------------------------------------------------------- */

  const {
    data: exactPlayers,
    error: exactError,
  } = await supabaseAdmin
    .from("guess_players")
    .select(`
      player_id,
      name,
      name_normalized,
      current_club_name
    `)
    .eq(
      "name_normalized",
      normalizedAnswer,
    )
    .limit(10);

  if (exactError) {
    throw exactError;
  }

  if (
    exactPlayers &&
    exactPlayers.length === 1
  ) {
    return {
      ok: true as const,

      player:
        exactPlayers[0] as GuessPlayer,
    };
  }

  if (
    exactPlayers &&
    exactPlayers.length > 1
  ) {
    return {
      ok: false as const,

      status: 409,

      ambiguous: true,

      error:
        "Bu isimde birden fazla futbolcu bulundu. Listeden seçim yap.",
    };
  }

  /* -------------------------------------------------------
     4. TAM SOYADI
  ------------------------------------------------------- */

  const {
    data: surnameCandidates,
    error: surnameError,
  } = await supabaseAdmin
    .from("guess_players")
    .select(`
      player_id,
      name,
      name_normalized,
      current_club_name
    `)
    .ilike(
      "name_normalized",
      `%${normalizedAnswer}%`,
    )
    .limit(50);

  if (surnameError) {
    throw surnameError;
  }

  const exactSurnameMatches =
    (
      surnameCandidates ??
      []
    ).filter(
      (player) => {
        const normalizedName =
          normalizeText(
            player.name_normalized ??
              player.name ??
              "",
          );

        const parts =
          normalizedName
            .split(" ")
            .filter(Boolean);

        const surname =
          parts[
            parts.length - 1
          ] ?? "";

        return (
          surname ===
          normalizedAnswer
        );
      },
    );

  if (
    exactSurnameMatches.length === 1
  ) {
    return {
      ok: true as const,

      player:
        exactSurnameMatches[0] as GuessPlayer,
    };
  }

  if (
    exactSurnameMatches.length > 1
  ) {
    return {
      ok: false as const,

      status: 409,

      ambiguous: true,

      error:
        "Bu soyadında birden fazla futbolcu bulundu. Listeden seçim yap.",

      players:
        exactSurnameMatches
          .slice(
            0,
            10,
          )
          .map(
            (player) => ({
              playerId:
                player.player_id,

              name:
                player.name,

              currentClubName:
                player.current_club_name ??
                null,
            }),
          ),
    };
  }

  return {
    ok: false as const,

    status: 404,

    error:
      "Bu isim veya soyadla eşleşen futbolcu bulunamadı.",
  };
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       1. AUTH
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await authSupabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Giriş yapmalısın.",
        },
        {
          status: 401,
        },
      );
    }

    const currentUserId =
      user.id;

    /* =====================================================
       2. DUEL ID
    ===================================================== */

    const {
      id,
    } =
      await context.params;

    const duelId =
      Number(id);

    if (
      !Number.isInteger(
        duelId,
      ) ||
      duelId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçerli düello seçilmedi.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       3. BODY
    ===================================================== */

    const body =
      (await request.json()) as AnswerBody;

    const rawAnswer =
      body.answer
        ?.trim() ??
      "";

    const playerId =
      body.playerId
        ? Number(
            body.playerId,
          )
        : null;

    if (
      !playerId &&
      !rawAnswer
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bir futbolcu seçmeli veya isim yazmalısın.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       4. DUEL
    ===================================================== */

    const {
      data: duel,
      error: duelError,
    } = await supabaseAdmin
      .from("duels")
      .select(`
        id,
        challenger_id,
        opponent_id,
        game_code,
        status,
        challenger_score,
        opponent_score,
        winner_id
      `)
      .eq(
        "id",
        duelId,
      )
      .maybeSingle();

    if (duelError) {
      throw duelError;
    }

    if (!duel) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Düello bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       5. PLAYER AUTH
    ===================================================== */

    const isChallenger =
      duel.challenger_id ===
      currentUserId;

    const isOpponent =
      duel.opponent_id ===
      currentUserId;

    if (
      !isChallenger &&
      !isOpponent
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu düelloda oyuncu değilsin.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      duel.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu düello 2 Takım 1 Oyuncu oyunu değil.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      duel.status !==
      "active"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            duel.status ===
            "completed"
              ? "Bu düello zaten tamamlandı."
              : "Düello şu anda aktif değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       6. CURRENT ROUND
    ===================================================== */

    const {
      data: currentRound,
      error: roundError,
    } = await supabaseAdmin
      .from(
        "duel_club_clash_rounds",
      )
      .select(`
        id,
        duel_id,
        round_no,
        club_a,
        club_b,
        winner_user_id,
        completed_at
      `)
      .eq(
        "duel_id",
        duelId,
      )
      .is(
        "completed_at",
        null,
      )
      .order(
        "round_no",
        {
          ascending: true,
        },
      )
      .limit(1)
      .maybeSingle();

    if (roundError) {
      throw roundError;
    }

    if (!currentRound) {
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
       7. PLAYER RESOLVE
    ===================================================== */

    const resolved =
      await resolvePlayer(
        playerId,
        rawAnswer,
      );

    if (!resolved.ok) {
      return NextResponse.json(
        {
          ok: false,

          error:
            resolved.error,

          ambiguous:
            "ambiguous" in
            resolved
              ? resolved.ambiguous
              : false,

          players:
            "players" in
            resolved
              ? resolved.players
              : undefined,
        },
        {
          status:
            resolved.status,
        },
      );
    }

    const player =
      resolved.player;

    /* =====================================================
       8. PLAYER CLUBS
    ===================================================== */

    const {
      data: clubRows,
      error: clubsError,
    } = await supabaseAdmin
      .from(
        "player_quiz_clubs",
      )
      .select(`
        player_id,
        club_name
      `)
      .eq(
        "player_id",
        player.player_id,
      );

    if (clubsError) {
      throw clubsError;
    }

    const playerClubs =
      new Set(
        (
          clubRows ??
          []
        )
          .map(
            (row) =>
              row.club_name
                ?.trim(),
          )
          .filter(
            (
              club,
            ): club is string =>
              Boolean(
                club,
              ),
          ),
      );

    const hasClubA =
      playerClubs.has(
        currentRound.club_a,
      );

    const hasClubB =
      playerClubs.has(
        currentRound.club_b,
      );

    const isCorrect =
      hasClubA &&
      hasClubB;

    /* =====================================================
       9. ATTEMPT
    ===================================================== */

    const {
      error: attemptError,
    } = await supabaseAdmin
      .from(
        "duel_club_clash_attempts",
      )
      .insert({
        duel_id:
          duelId,

        round_id:
          currentRound.id,

        user_id:
          currentUserId,

        player_id:
          player.player_id,

        answer_text:
          player.name,

        is_correct:
          isCorrect,
      });

    if (attemptError) {
      console.error(
        "Club Clash attempt kayıt hatası:",
        attemptError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Cevap kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       10. WRONG
    ===================================================== */

    if (!isCorrect) {
      return NextResponse.json({
        ok: true,

        correct:
          false,

        won:
          false,

        roundCompleted:
          false,

        gameFinished:
          false,

        player: {
          playerId:
            player.player_id,

          name:
            player.name,
        },

        message:
          `${player.name} iki takımda da oynamadı. Tekrar dene.`,
      });
    }

    /* =====================================================
       11. CORRECT — ROUND LOCK
    ===================================================== */

    const now =
      new Date().toISOString();

    const roundUpdate =
      isChallenger
        ? {
            winner_user_id:
              currentUserId,

            challenger_answer:
              player.name,

            challenger_answer_player_id:
              player.player_id,

            challenger_answered_at:
              now,

            completed_at:
              now,
          }
        : {
            winner_user_id:
              currentUserId,

            opponent_answer:
              player.name,

            opponent_answer_player_id:
              player.player_id,

            opponent_answered_at:
              now,

            completed_at:
              now,
          };

    const {
      data: wonRound,
      error: winError,
    } = await supabaseAdmin
      .from(
        "duel_club_clash_rounds",
      )
      .update(
        roundUpdate,
      )
      .eq(
        "id",
        currentRound.id,
      )
      .is(
        "completed_at",
        null,
      )
      .select(`
        id,
        duel_id,
        round_no,
        club_a,
        club_b,
        winner_user_id,
        challenger_answer,
        opponent_answer,
        completed_at
      `)
      .maybeSingle();

    if (winError) {
      throw winError;
    }

    /* =====================================================
       12. RAKİP ÖNCE DAVRANDI
    ===================================================== */

    if (!wonRound) {
      return NextResponse.json({
        ok: true,

        correct:
          true,

        won:
          false,

        roundCompleted:
          true,

        gameFinished:
          false,

        player: {
          playerId:
            player.player_id,

          name:
            player.name,
        },

        message:
          "Cevabın doğru ama rakibin senden önce davrandı.",
      });
    }

    /* =====================================================
       13. COMPLETED ROUNDS
    ===================================================== */

    const {
      data: completedRounds,
      error:
        completedRoundsError,
    } = await supabaseAdmin
      .from(
        "duel_club_clash_rounds",
      )
      .select(`
        id,
        round_no,
        winner_user_id,
        completed_at
      `)
      .eq(
        "duel_id",
        duelId,
      )
      .not(
        "completed_at",
        "is",
        null,
      );

    if (
      completedRoundsError
    ) {
      throw completedRoundsError;
    }

    /* =====================================================
       14. SCORE
    ===================================================== */

    const challengerScore =
      (
        completedRounds ??
        []
      ).filter(
        (round) =>
          round.winner_user_id ===
          duel.challenger_id,
      ).length;

    const opponentScore =
      (
        completedRounds ??
        []
      ).filter(
        (round) =>
          round.winner_user_id ===
          duel.opponent_id,
      ).length;

    /* =====================================================
       15. FIRST TO 3
    ===================================================== */

    const gameFinished =
      challengerScore >=
        WIN_SCORE ||
      opponentScore >=
        WIN_SCORE;

    let winnerId:
      | string
      | null =
      null;

    if (
      challengerScore >=
      WIN_SCORE
    ) {
      winnerId =
        duel.challenger_id;
    }

    if (
      opponentScore >=
      WIN_SCORE
    ) {
      winnerId =
        duel.opponent_id;
    }

    /* =====================================================
       16. DUEL UPDATE
    ===================================================== */

    const duelUpdate: {
      challenger_score: number;
      opponent_score: number;
      updated_at: string;

      status?: string;

      winner_id?:
        | string
        | null;

      completed_at?: string;
    } = {
      challenger_score:
        challengerScore,

      opponent_score:
        opponentScore,

      updated_at:
        now,
    };

    if (gameFinished) {
      duelUpdate.status =
        "completed";

      duelUpdate.winner_id =
        winnerId;

      duelUpdate.completed_at =
        now;
    }

    const {
      error:
        duelUpdateError,
    } = await supabaseAdmin
      .from("duels")
      .update(
        duelUpdate,
      )
      .eq(
        "id",
        duelId,
      )
      .eq(
        "status",
        "active",
      );

    if (duelUpdateError) {
      throw duelUpdateError;
    }

    /* =====================================================
   16.1 DUEL STATS

   Oyun 3 puanda bittiyse iki oyuncunun
   games_played değerini ve kazananın
   games_won değerini tek sefer güncelle.
===================================================== */

if (gameFinished) {
  const {
    data: statsApplied,
    error: statsError,
  } = await supabaseAdmin.rpc(
    "apply_duel_stats",
    {
      p_duel_id:
        duelId,
    },
  );

  if (statsError) {
    console.error(
      "Duel stats apply hatası:",
      statsError,
    );

    /*
     * Maçı geri bozmuyoruz.
     *
     * Düello zaten tamamlandı.
     * stats_applied false kalacağı için
     * gerekirse tekrar uygulanabilir.
     */
  } else {
    console.log(
      "Duel stats sonucu:",
      statsApplied,
    );
  }
}

    /* =====================================================
       17. NEXT ROUND
    ===================================================== */

    let nextRound:
      | {
          id: number;
          round_no: number;
          club_a: string;
          club_b: string;
        }
      | null =
      null;

    if (!gameFinished) {
      const {
        data:
          nextRoundData,
        error:
          nextRoundError,
      } = await supabaseAdmin
        .from(
          "duel_club_clash_rounds",
        )
        .select(`
          id,
          round_no,
          club_a,
          club_b
        `)
        .eq(
          "duel_id",
          duelId,
        )
        .is(
          "completed_at",
          null,
        )
        .order(
          "round_no",
          {
            ascending: true,
          },
        )
        .limit(1)
        .maybeSingle();

      if (nextRoundError) {
        console.error(
          "Club Clash next round hatası:",
          nextRoundError,
        );
      }

      nextRound =
        nextRoundData ??
        null;
    }

    /* =====================================================
       18. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      correct:
        true,

      won:
        true,

      roundCompleted:
        true,

      gameFinished,

      winScore:
        WIN_SCORE,

      message:
        gameFinished
          ? "Doğru cevap! Düelloyu kazandın. 🏆"
          : "Doğru cevap! Round senin. ⚽",

      player: {
        playerId:
          player.player_id,

        name:
          player.name,
      },

      score: {
        challenger:
          challengerScore,

        opponent:
          opponentScore,
      },

      round:
        wonRound,

      nextRound,

      winnerId,
    });
  } catch (error) {
    console.error(
      "Club Clash answer endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Cevap kontrol edilemedi.",
      },
      {
        status: 500,
      },
    );
  }
}