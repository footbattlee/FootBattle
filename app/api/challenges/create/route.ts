import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME =
  "footbattle_guest";

const CHALLENGE_LIFETIME_HOURS =
  24;

const ALLOWED_GAME_CODES = [
  "club_clash",
  "player_quiz",
  "career_path",
  "guess_the_player",
] as const;

type AllowedGameCode =
  (typeof ALLOWED_GAME_CODES)[number];

type CreateChallengeBody = {
  gameCode?: AllowedGameCode;
  challengerName?: string;
};

function generateInviteToken() {
  return crypto.randomUUID()
    .replace(/-/g, "")
    .slice(0, 12);
}

function isAllowedGameCode(
  value: unknown,
): value is AllowedGameCode {
  return (
    typeof value === "string" &&
    ALLOWED_GAME_CODES.includes(
      value as AllowedGameCode,
    )
  );
}

function sanitizeGuestName(
  value: unknown,
) {
  const name =
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");

  if (!name) {
    return "Misafir";
  }

  return name.slice(0, 30);
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as CreateChallengeBody;

    if (
      !isAllowedGameCode(
        body.gameCode,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçersiz düello oyunu.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Kullanıcı giriş yaptıysa user_id kullan.
     * Giriş yapmadıysa guest cookie üret / mevcut olanı kullan.
     */
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

    let guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ?? null;

    /*
     * Kullanıcı giriş yapmışsa guest_id yazmak zorunda değiliz.
     *
     * Giriş yoksa guest id garanti ediyoruz.
     */
    if (
      !user &&
      !guestId
    ) {
      guestId =
        crypto.randomUUID();
    }

    const inviteToken =
      generateInviteToken();

    const expiresAt =
      new Date(
        Date.now() +
          CHALLENGE_LIFETIME_HOURS *
            60 *
            60 *
            1000,
      ).toISOString();

    const challengerName =
      user
        ? null
        : sanitizeGuestName(
            body.challengerName,
          );

    const {
      data: challenge,
      error: insertError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .insert({
          invite_token:
            inviteToken,

          game_code:
            body.gameCode,

          status:
            "waiting",

          challenger_user_id:
            user?.id ?? null,

          challenger_guest_id:
            user
              ? null
              : guestId,

          challenger_name:
            challengerName,

          opponent_user_id:
            null,

          opponent_guest_id:
            null,

          opponent_name:
            null,

          challenger_score:
            0,

          opponent_score:
            0,

          winner_side:
            null,

          expires_at:
            expiresAt,
        })
        .select(`
          id,
          invite_token,
          game_code,
          status,
          challenger_user_id,
          challenger_guest_id,
          challenger_name,
          created_at,
          expires_at
        `)
        .single();

    if (
      insertError ||
      !challenge
    ) {
      console.error(
        "Guest challenge oluşturulamadı:",
        insertError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Meydan okuma oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const baseUrl =
      (
        process.env
          .NEXT_PUBLIC_SITE_URL ??
        new URL(
          request.url,
        ).origin
      ).replace(
        /\/$/,
        "",
      );

    const sharePath =
      `/challenge/${challenge.invite_token}`;

    const shareUrl =
      `${baseUrl}${sharePath}`;

    const response =
      NextResponse.json({
        ok: true,

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

          sharePath,

          shareUrl,

          expiresAt:
            challenge.expires_at,
        },
      });

    /*
     * Guest kullanıcı için kalıcı kimlik cookie'si.
     *
     * HttpOnly:
     * JS tarafından okunamaz.
     *
     * SameSite Lax:
     * Challenge linkiyle siteye gelirken cookie kullanılabilir.
     */
    if (
      !user &&
      guestId
    ) {
      response.cookies.set(
        GUEST_COOKIE_NAME,
        guestId,
        {
          httpOnly: true,
          secure:
            process.env
              .NODE_ENV ===
            "production",

          sameSite:
            "lax",

          path:
            "/",

          maxAge:
            60 *
            60 *
            24 *
            365,
        },
      );
    }

    return response;
  } catch (error) {
    console.error(
      "Challenge create endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Meydan okuma oluşturulurken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}