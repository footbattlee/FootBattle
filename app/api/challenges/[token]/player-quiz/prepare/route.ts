import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME =
  "footbattle_guest";

const MIN_POPULARITY_SCORE =
  75;

type ChallengeRow = {
  id: number | string;
  invite_token: string;
  game_code: string;
  status: string;

  challenger_user_id:
    | string
    | null;

  challenger_guest_id:
    | string
    | null;

  opponent_user_id:
    | string
    | null;

  opponent_guest_id:
    | string
    | null;
};

type PlayerCandidate = {
  player_id: number;
  name: string | null;
  image_url: string | null;
  nationality: string | null;
  popularity_score: number | null;
};

function sanitizeToken(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .replace(
      /[^a-zA-Z0-9]/g,
      "",
    )
    .slice(0, 64);
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      token: string;
    }>;
  },
) {
  try {
    const {
      token: rawToken,
    } =
      await context.params;

    const token =
      sanitizeToken(
        rawToken,
      );

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli challenge bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       AUTH / GUEST
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authClient.auth.getUser();

    const cookieStore =
      await cookies();

    const guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ??
      null;

    /* =====================================================
       CHALLENGE
    ===================================================== */

    const {
      data:
        challengeData,

      error:
        challengeError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .select(`
          id,
          invite_token,
          game_code,
          status,
          challenger_user_id,
          challenger_guest_id,
          opponent_user_id,
          opponent_guest_id
        `)
        .eq(
          "invite_token",
          token,
        )
        .maybeSingle();

    if (
      challengeError ||
      !challengeData
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge bulunamadı.",
        },
        {
          status:
            challengeError
              ? 500
              : 404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    if (
      challenge.game_code !==
      "player_quiz"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge Player Quiz değil.",
        },
        {
          status: 400,
        },
      );
    }

    const isChallenger =
      user
        ? challenge
            .challenger_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .challenger_guest_id ===
                guestId,
          );

    const isOpponent =
      user
        ? challenge
            .opponent_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .opponent_guest_id ===
                guestId,
          );

    if (
      !isChallenger &&
      !isOpponent
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge'a erişemezsin.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      challenge.status !==
        "ready" &&
      challenge.status !==
        "playing"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge henüz oynanabilir durumda değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       EXISTING GAME?
    ===================================================== */

    const {
      data:
        existingGame,

      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenge_player_quiz",
        )
        .select(`
          challenge_id,
          player_id
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .maybeSingle();

    if (
      existingError
    ) {
      console.error(
        "Existing Player Quiz VS okunamadı:",
        existingError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge oyunu okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    let playerId:
      | number
      | null =
      existingGame
        ? Number(
            existingGame.player_id,
          )
        : null;

    /* =====================================================
       CREATE GAME
    ===================================================== */

    if (!playerId) {
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
            MIN_POPULARITY_SCORE,
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
          )
          .limit(
            500,
          );

      if (
        candidatesError ||
        !candidates ||
        candidates.length ===
          0
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Uygun Player Quiz oyuncusu bulunamadı.",
          },
          {
            status: 500,
          },
        );
      }

      const shuffled =
        [
          ...candidates,
        ].sort(
          () =>
            Math.random() -
            0.5,
        );

      let selectedPlayer:
        | PlayerCandidate
        | null =
        null;

      for (
        const candidate
        of shuffled.slice(
          0,
          80,
        )
      ) {
        const candidateId =
          Number(
            candidate.player_id,
          );

        const [
          detailsResult,
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
                candidateId,
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
                candidateId,
              )
              .order(
                "career_order",
                {
                  ascending:
                    true,
                },
              ),
          ]);

        if (
          detailsResult.error ||
          !detailsResult.data
            ?.birth_year
        ) {
          continue;
        }

        if (
          clubsResult.error
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

        if (
          seniorCareer.length <
          1
        ) {
          continue;
        }

        selectedPlayer =
          candidate as PlayerCandidate;

        break;
      }

      if (
        !selectedPlayer
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Player Quiz VS için hazır oyuncu seçilemedi.",
          },
          {
            status: 500,
          },
        );
      }

      playerId =
        Number(
          selectedPlayer.player_id,
        );

      const {
        data:
          insertedGame,

        error:
          insertError,
      } =
        await supabaseAdmin
          .from(
            "guest_challenge_player_quiz",
          )
          .insert({
            challenge_id:
              Number(
                challenge.id,
              ),

            player_id:
              playerId,
          })
          .select(`
            challenge_id,
            player_id
          `)
          .maybeSingle();

      if (
        insertError ||
        !insertedGame
      ) {
        const {
          data:
            raceGame,

          error:
            raceError,
        } =
          await supabaseAdmin
            .from(
              "guest_challenge_player_quiz",
            )
            .select(`
              challenge_id,
              player_id
            `)
            .eq(
              "challenge_id",
              challenge.id,
            )
            .maybeSingle();

        if (
          raceError ||
          !raceGame
        ) {
          console.error(
            "Player Quiz VS oluşturma hatası:",
            insertError,
            raceError,
          );

          return NextResponse.json(
            {
              ok: false,
              error:
                "Challenge oyunu hazırlanamadı.",
            },
            {
              status: 500,
            },
          );
        }

        playerId =
          Number(
            raceGame.player_id,
          );
      }
    }

    /* =====================================================
       PLAYER
    ===================================================== */

    const {
      data:
        player,

      error:
        playerError,
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
            "Challenge oyuncusu okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       CLEAN CAREER
    ===================================================== */

    const {
      data:
        rawClubs,

      error:
        rawClubsError,
    } =
      await supabaseAdmin
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
        .order(
          "career_order",
          {
            ascending:
              true,
          },
        );

    if (
      rawClubsError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge kariyer bilgisi okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const seniorCareer =
      buildPlayerQuizSeniorCareer(
        (
          rawClubs ??
          []
        ) as RawPlayerQuizClub[],
      );

    if (
      seniorCareer.length <
      1
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge kariyer kulüpleri hazırlanamadı.",
        },
        {
          status: 422,
        },
      );
    }

    return NextResponse.json({
      ok: true,

      role:
        isChallenger
          ? "challenger"
          : "opponent",

      challenge: {
        id:
          Number(
            challenge.id,
          ),

        token:
          challenge.invite_token,

        gameCode:
          challenge.game_code,

        status:
          challenge.status,
      },

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

      board: {
        birthYearSlots:
          1,

        nationalitySlots:
          1,

        clubSlots:
          seniorCareer.length,

        totalSlots:
          seniorCareer.length +
          2,
      },

      minimumSearchLength:
        3,

      guessTimeSeconds:
        30,
    });
  } catch (error) {
    console.error(
      "Player Quiz VS prepare endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Challenge oyunu hazırlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}