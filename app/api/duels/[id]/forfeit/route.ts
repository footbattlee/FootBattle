import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       1. AUTH
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: { user },
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
       3. DUEL
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
        winner_id,
        completed_at,
        stats_applied
      `)
      .eq(
        "id",
        duelId,
      )
      .maybeSingle();

    if (duelError) {
      console.error(
        "Forfeit duel sorgu hatası:",
        duelError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello okunamadı.",
        },
        {
          status: 500,
        },
      );
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
       4. KULLANICI DÜELLODA MI?
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

    /* =====================================================
       5. GAME CONTROL
    ===================================================== */

    if (
      duel.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu işlem yalnızca 2 Takım 1 Oyuncu düellosunda kullanılabilir.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       6. ZATEN TAMAMLANDI MI?
    ===================================================== */

    if (
      duel.status ===
      "completed"
    ) {
      /*
       * Eski veya yarım kalmış bir kayıtta
       * stats_applied false ise istatistikleri
       * burada da toparlamayı deniyoruz.
       */
      if (
        duel.winner_id &&
        !duel.stats_applied
      ) {
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
            "Completed duel stats apply hatası:",
            statsError,
          );
        } else {
          console.log(
            "Completed duel stats sonucu:",
            statsApplied,
          );
        }
      }

      return NextResponse.json(
        {
          ok: true,

          alreadyCompleted:
            true,

          message:
            "Düello zaten tamamlanmış.",

          duel: {
            id:
              duel.id,

            status:
              duel.status,

            winnerId:
              duel.winner_id,

            challengerScore:
              duel.challenger_score,

            opponentScore:
              duel.opponent_score,

            completedAt:
              duel.completed_at,
          },
        },
        {
          status: 200,
        },
      );
    }

    /* =====================================================
       7. ACTIVE MI?
    ===================================================== */

    if (
      duel.status !==
      "active"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Yalnızca devam eden düellodan pes edebilirsin.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       8. KAZANANI BELİRLE
    ===================================================== */

    const winnerId =
      isChallenger
        ? duel.opponent_id
        : duel.challenger_id;

    const forfeitedBy =
      currentUserId;

    const now =
      new Date().toISOString();

    /* =====================================================
       9. DUEL UPDATE
    ===================================================== */

    const {
      data: updatedDuel,
      error: updateError,
    } = await supabaseAdmin
      .from("duels")
      .update({
        status:
          "completed",

        winner_id:
          winnerId,

        completed_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        duelId,
      )
      .eq(
        "status",
        "active",
      )
      .select(`
        id,
        challenger_id,
        opponent_id,
        game_code,
        status,
        challenger_score,
        opponent_score,
        winner_id,
        started_at,
        completed_at,
        updated_at,
        stats_applied
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "Forfeit duel update hatası:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düellodan pes edilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       10. RACE CONDITION
    ===================================================== */

    if (!updatedDuel) {
      const {
        data: latestDuel,
        error: latestError,
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
          winner_id,
          started_at,
          completed_at,
          updated_at,
          stats_applied
        `)
        .eq(
          "id",
          duelId,
        )
        .maybeSingle();

      if (latestError) {
        console.error(
          "Forfeit sonrası güncel duel sorgu hatası:",
          latestError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "Düello durumu kontrol edilemedi.",
          },
          {
            status: 500,
          },
        );
      }

      if (
        latestDuel?.status ===
        "completed"
      ) {
        if (
          latestDuel.winner_id &&
          !latestDuel.stats_applied
        ) {
          const {
            error: statsError,
          } =
            await supabaseAdmin.rpc(
              "apply_duel_stats",
              {
                p_duel_id:
                  duelId,
              },
            );

          if (statsError) {
            console.error(
              "Race condition stats apply hatası:",
              statsError,
            );
          }
        }

        return NextResponse.json({
          ok: true,

          alreadyCompleted:
            true,

          message:
            "Düello zaten tamamlandı.",

          duel:
            latestDuel,
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düellodan pes edilemedi. Düello durumu değişmiş olabilir.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       11. DUEL STATS
    ===================================================== */

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
        "Forfeit duel stats apply hatası:",
        statsError,
      );

      /*
       * Maçı geri almıyoruz.
       * stats_applied false kalırsa
       * daha sonra yeniden uygulanabilir.
       */
    } else {
      console.log(
        "Forfeit duel stats sonucu:",
        statsApplied,
      );
    }

    /* =====================================================
       12. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      forfeited:
        true,

      message:
        "Düellodan pes ettin. Rakibin kazandı.",

      forfeitedBy,

      winnerId,

      statsApplied:
        statsApplied ??
        false,

      duel: {
        id:
          updatedDuel.id,

        status:
          updatedDuel.status,

        challengerScore:
          updatedDuel.challenger_score,

        opponentScore:
          updatedDuel.opponent_score,

        winnerId:
          updatedDuel.winner_id,

        completedAt:
          updatedDuel.completed_at,
      },
    });
  } catch (error) {
    console.error(
      "Duel forfeit endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Düellodan pes edilemedi.",
      },
      {
        status: 500,
      },
    );
  }
}