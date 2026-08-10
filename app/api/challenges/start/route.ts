import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME =
  "footbattle_guest";

type StartBody = {
  token?: string;
};

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

  started_at:
    | string
    | null;

  expires_at: string;
};

function sanitizeToken(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 64);
}

function isExpired(
  expiresAt: string,
) {
  const timestamp =
    new Date(expiresAt).getTime();

  return (
    !Number.isNaN(timestamp) &&
    timestamp <= Date.now()
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as StartBody;

    const token =
      sanitizeToken(
        body.token,
      );

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli meydan okuma bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

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

    const {
      data: challengeData,
      error: challengeError,
    } =
      await supabaseAdmin
        .from("guest_challenges")
        .select(`
          id,
          invite_token,
          game_code,
          status,
          challenger_user_id,
          challenger_guest_id,
          opponent_user_id,
          opponent_guest_id,
          started_at,
          expires_at
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
            "Meydan okuma bulunamadı.",
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
      isExpired(
        challenge.expires_at,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Meydan okumanın süresi dolmuş.",
        },
        {
          status: 410,
        },
      );
    }

    const isChallenger =
      user
        ? challenge.challenger_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge.challenger_guest_id ===
                guestId,
          );

    const isOpponent =
      user
        ? challenge.opponent_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge.opponent_guest_id ===
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
            "Bu düelloyu başlatamazsın.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      !challenge.opponent_user_id &&
      !challenge.opponent_guest_id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Rakip henüz katılmadı.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      challenge.status ===
      "playing"
    ) {
      return NextResponse.json({
        ok: true,
        alreadyStarted: true,
        gameCode:
          challenge.game_code,
      });
    }

    if (
      challenge.status !==
      "ready"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello başlatılabilir durumda değil.",
        },
        {
          status: 409,
        },
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updatedChallenge,
      error: updateError,
    } =
      await supabaseAdmin
        .from("guest_challenges")
        .update({
          status:
            "playing",
          started_at:
            now,
          updated_at:
            now,
        })
        .eq(
          "id",
          challenge.id,
        )
        .eq(
          "status",
          "ready",
        )
        .select(`
          id,
          invite_token,
          game_code,
          status,
          started_at
        `)
        .maybeSingle();

    if (updateError) {
      console.error(
        "Challenge start hatası:",
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

    if (!updatedChallenge) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello durumu değişti. Tekrar dene.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyStarted:
        false,
      challenge: {
        id:
          Number(
            updatedChallenge.id,
          ),
        token:
          updatedChallenge.invite_token,
        gameCode:
          updatedChallenge.game_code,
        status:
          updatedChallenge.status,
        startedAt:
          updatedChallenge.started_at,
      },
    });
  } catch (error) {
    console.error(
      "Challenge start endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Düello başlatılırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}