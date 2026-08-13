import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/server";

type CreateTransferQuizRequest = {
  playerId?: number;
  headline?: string;
  clubName?: string;
};

/* =========================================================
   GET
   Aktif quiz + son kayıtları getir
========================================================= */

export async function GET() {
  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "transfer_quizzes",
        )
        .select(`
          id,
          player_id,
          headline,
          club_name,
          is_active,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          20,
        );

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Transfer quiz kayıtları okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const rows =
      data ??
      [];

    const playerIds =
      Array.from(
        new Set(
          rows
            .map(
              (
                row,
              ) =>
                Number(
                  row.player_id,
                ),
            )
            .filter(
              (
                id,
              ) =>
                Number.isInteger(
                  id,
                ) &&
                id >
                  0,
            ),
        ),
      );

    let playerMap =
      new Map<
        number,
        {
          name: string;
          image_url:
            | string
            | null;
        }
      >();

    if (
      playerIds.length >
      0
    ) {
      const {
        data:
          playerRows,
      } =
        await supabaseAdmin
          .from(
            "guess_players",
          )
          .select(`
            player_id,
            name,
            image_url
          `)
          .in(
            "player_id",
            playerIds,
          );

      playerMap =
        new Map(
          (
            playerRows ??
            []
          ).map(
            (
              player,
            ) => [
              Number(
                player.player_id,
              ),
              {
                name:
                  player.name,
                image_url:
                  player.image_url ??
                  null,
              },
            ],
          ),
        );
    }

    const quizzes =
      rows.map(
        (
          row,
        ) => {
          const player =
            playerMap.get(
              Number(
                row.player_id,
              ),
            );

          return {
            id:
              row.id,

            playerId:
              Number(
                row.player_id,
              ),

            playerName:
              player?.name ??
              "Bilinmeyen oyuncu",

            playerImageUrl:
              player
                ?.image_url ??
              null,

            headline:
              row.headline ??
              "",

            clubName:
              row.club_name ??
              "",

            isActive:
              Boolean(
                row.is_active,
              ),

            createdAt:
              row.created_at,
          };
        },
      );

    return NextResponse.json({
      ok: true,

      activeQuiz:
        quizzes.find(
          (
            quiz,
          ) =>
            quiz.isActive,
        ) ??
        null,

      quizzes,
    });
  } catch (error) {
    console.error(
      "Transfer Quiz admin GET error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST
   Yeni quiz oluştur + aktif et
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as CreateTransferQuizRequest;

    const playerId =
      Number(
        body.playerId,
      );

    const headline =
      body.headline?.trim() ??
      "";

    const clubName =
      body.clubName?.trim() ??
      "";

    if (
      !Number.isInteger(
        playerId,
      ) ||
      playerId <=
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli bir oyuncu seç.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !headline
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Başlık boş olamaz.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !clubName
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Hedef kulüp boş olamaz.",
        },
        {
          status: 400,
        },
      );
    }

    /* Oyuncu gerçekten var mı? */

    const {
      data: player,
      error:
        playerError,
    } =
      await supabaseAdmin
        .from(
          "guess_players",
        )
        .select(`
          player_id,
          name
        `)
        .eq(
          "player_id",
          playerId,
        )
        .maybeSingle();

    if (
      playerError ||
      !player
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seçilen oyuncu bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* Önce tüm aktifleri kapat */

    const {
      error:
        deactivateError,
    } =
      await supabaseAdmin
        .from(
          "transfer_quizzes",
        )
        .update({
          is_active:
            false,
        })
        .eq(
          "is_active",
          true,
        );

    if (
      deactivateError
    ) {
      console.error(
        "Eski Transfer Quiz kayıtları kapatılamadı:",
        deactivateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Eski aktif quiz kapatılamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* Yeni kayıt */

    const {
      data:
        createdQuiz,
      error:
        createError,
    } =
      await supabaseAdmin
        .from(
          "transfer_quizzes",
        )
        .insert({
          player_id:
            playerId,

          headline,

          club_name:
            clubName,

          is_active:
            true,
        })
        .select(`
          id,
          player_id,
          headline,
          club_name,
          is_active,
          created_at
        `)
        .single();

    if (
      createError ||
      !createdQuiz
    ) {
      console.error(
        "Transfer Quiz oluşturulamadı:",
        createError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Transfer Quiz oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      ok: true,

      quiz: {
        id:
          createdQuiz.id,

        playerId,

        playerName:
          player.name,

        headline:
          createdQuiz.headline,

        clubName:
          createdQuiz.club_name,

        isActive:
          createdQuiz.is_active,

        createdAt:
          createdQuiz.created_at,
      },
    });
  } catch (error) {
    console.error(
      "Transfer Quiz admin POST error:",
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