import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type StartBody = {
  duelId?: number;
};

type PrepareResponse = {
  ok?: boolean;

  alreadyPrepared?: boolean;

  message?: string;

  error?: string;

  roundCount?: number;

  rounds?: unknown[];
};

/* =========================================================
   CLUB CLASH PREPARE
========================================================= */

async function prepareClubClash(
  request: Request,
  duelId: number,
) {
  /*
   * Aynı Next.js uygulamasındaki prepare endpoint'ini
   * server tarafından çağırıyoruz.
   *
   * Kullanıcının auth cookie'sini de taşıyoruz.
   */
  const prepareUrl =
    new URL(
      `/api/duels/${duelId}/club-clash/prepare`,
      request.url,
    );

  const cookie =
    request.headers.get("cookie");

  const headers =
    new Headers();

  if (cookie) {
    headers.set(
      "cookie",
      cookie,
    );
  }

  const response =
    await fetch(
      prepareUrl,
      {
        method: "POST",

        headers,

        cache: "no-store",
      },
    );

  let result:
    PrepareResponse;

  try {
    result =
      (await response.json()) as PrepareResponse;
  } catch {
    throw new Error(
      "2 Takım 1 Oyuncu prepare endpoint'i geçersiz cevap döndürdü.",
    );
  }

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      result.error ??
        "2 Takım 1 Oyuncu roundları hazırlanamadı.",
    );
  }

  return result;
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
       2. BODY
    ===================================================== */

    const body =
      (await request.json()) as StartBody;

    const duelId =
      Number(
        body.duelId,
      );

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
       3. DÜELLOYU BUL
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
        created_at,
        accepted_at,
        started_at,
        completed_at,
        updated_at
      `)
      .eq(
        "id",
        duelId,
      )
      .maybeSingle();

    if (duelError) {
      console.error(
        "Düello sorgu hatası:",
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
            "Bu düelloyu başlatamazsın.",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       5. ZATEN ACTIVE
    ===================================================== */

    if (
      duel.status ===
      "active"
    ) {
      /*
       * Club Clash zaten active ise bile prepare'ı
       * tekrar çağırıyoruz.
       *
       * Prepare endpoint idempotent:
       * round varsa alreadyPrepared:true döner.
       *
       * Round yoksa hazırlar.
       */
      let prepareResult:
        PrepareResponse | null =
        null;

      if (
        duel.game_code ===
        "club_clash"
      ) {
        try {
          prepareResult =
            await prepareClubClash(
              request,
              duelId,
            );
        } catch (prepareError) {
          console.error(
            "Active düello Club Clash prepare hatası:",
            prepareError,
          );

          return NextResponse.json(
            {
              ok: false,

              error:
                prepareError instanceof Error
                  ? prepareError.message
                  : "Oyun roundları hazırlanamadı.",

              duel,

              game: {
                code:
                  duel.game_code,

                url:
                  `/duels/${duel.id}`,
              },
            },
            {
              status: 500,
            },
          );
        }
      }

      return NextResponse.json(
        {
          ok: true,

          message:
            "Düello zaten başlatılmış.",

          duel,

          game: {
            code:
              duel.game_code,

            url:
              `/duels/${duel.id}`,
          },

          prepare:
            prepareResult
              ? {
                  ok: true,

                  alreadyPrepared:
                    prepareResult.alreadyPrepared ??
                    false,

                  roundCount:
                    prepareResult.roundCount ??
                    0,

                  message:
                    prepareResult.message ??
                    null,
                }
              : null,
        },
        {
          status: 200,
        },
      );
    }

    /* =====================================================
       6. ACCEPTED MI?
    ===================================================== */

    if (
      duel.status !==
      "accepted"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Yalnızca kabul edilmiş düellolar başlatılabilir.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       7. DÜELLOYU ACTIVE YAP
    ===================================================== */

    const now =
      new Date().toISOString();

    const {
      data: updatedDuel,
      error: updateError,
    } = await supabaseAdmin
      .from("duels")
      .update({
        status:
          "active",

        started_at:
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
        "accepted",
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
        created_at,
        accepted_at,
        started_at,
        completed_at,
        updated_at
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "Düello başlatma hatası:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Düello başlatılamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       8. RACE CONDITION
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
          created_at,
          accepted_at,
          started_at,
          completed_at,
          updated_at
        `)
        .eq(
          "id",
          duelId,
        )
        .maybeSingle();

      if (latestError) {
        console.error(
          "Güncel düello okunamadı:",
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

      /*
       * Diğer oyuncu milisaniyeler önce
       * başlatmış olabilir.
       */
      if (
        latestDuel?.status ===
        "active"
      ) {
        let prepareResult:
          PrepareResponse | null =
          null;

        if (
          latestDuel.game_code ===
          "club_clash"
        ) {
          try {
            prepareResult =
              await prepareClubClash(
                request,
                duelId,
              );
          } catch (prepareError) {
            console.error(
              "Race condition sonrası prepare hatası:",
              prepareError,
            );

            return NextResponse.json(
              {
                ok: false,

                error:
                  prepareError instanceof Error
                    ? prepareError.message
                    : "Oyun roundları hazırlanamadı.",

                duel:
                  latestDuel,
              },
              {
                status: 500,
              },
            );
          }
        }

        return NextResponse.json({
          ok: true,

          message:
            "Düello zaten başlatılmış.",

          duel:
            latestDuel,

          game: {
            code:
              latestDuel.game_code,

            url:
              `/duels/${latestDuel.id}`,
          },

          prepare:
            prepareResult
              ? {
                  ok: true,

                  alreadyPrepared:
                    prepareResult.alreadyPrepared ??
                    false,

                  roundCount:
                    prepareResult.roundCount ??
                    0,

                  message:
                    prepareResult.message ??
                    null,
                }
              : null,
        });
      }

      return NextResponse.json(
        {
          ok: false,

          error:
            "Düello başlatılamadı. Düello durumu değişmiş olabilir.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       9. CLUB CLASH ROUNDLARINI OTOMATİK HAZIRLA
    ===================================================== */

    let prepareResult:
      PrepareResponse | null =
      null;

    if (
      updatedDuel.game_code ===
      "club_clash"
    ) {
      try {
        prepareResult =
          await prepareClubClash(
            request,
            updatedDuel.id,
          );
      } catch (prepareError) {
        console.error(
          "Club Clash otomatik prepare hatası:",
          prepareError,
        );

        /*
         * Düello ACTIVE olmuş olabilir ama round hazırlama
         * başarısız olmuş olabilir.
         *
         * start tekrar çağrılırsa yukarıdaki ACTIVE bloğu
         * prepare'ı yeniden deneyecek.
         */
        return NextResponse.json(
          {
            ok: false,

            error:
              prepareError instanceof Error
                ? prepareError.message
                : "Düello başladı fakat oyun roundları hazırlanamadı.",

            duel:
              updatedDuel,

            game: {
              code:
                updatedDuel.game_code,

              url:
                `/duels/${updatedDuel.id}`,
            },

            recoverable:
              true,
          },
          {
            status: 500,
          },
        );
      }
    }

    /* =====================================================
       10. BAŞARILI
    ===================================================== */

    return NextResponse.json({
      ok: true,

      message:
        updatedDuel.game_code ===
        "club_clash"
          ? "Düello başlatıldı ve 2 Takım 1 Oyuncu hazırlandı. ⚽⚔️"
          : "Düello başlatıldı. ⚔️",

      duel:
        updatedDuel,

      game: {
        code:
          updatedDuel.game_code,

        url:
          `/duels/${updatedDuel.id}`,
      },

      prepare:
        prepareResult
          ? {
              ok:
                true,

              alreadyPrepared:
                prepareResult.alreadyPrepared ??
                false,

              roundCount:
                prepareResult.roundCount ??
                0,

              message:
                prepareResult.message ??
                null,
            }
          : null,
    });
  } catch (error) {
    console.error(
      "Duel start endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Düello başlatılamadı.",
      },
      {
        status: 500,
      },
    );
  }
}