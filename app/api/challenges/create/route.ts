import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   SETTINGS
========================================================= */

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

/* =========================================================
   TYPES
========================================================= */

type AllowedGameCode =
  (typeof ALLOWED_GAME_CODES)[number];

type CreateChallengeBody = {
  gameCode?: AllowedGameCode;
  challengerName?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function generateInviteToken() {
  return crypto
    .randomUUID()
    .replace(
      /-/g,
      "",
    )
    .slice(
      0,
      12,
    );
}

function isAllowedGameCode(
  value: unknown,
): value is AllowedGameCode {
  return (
    typeof value ===
      "string" &&
    ALLOWED_GAME_CODES.includes(
      value as AllowedGameCode,
    )
  );
}

function sanitizePlayerName(
  value: unknown,
) {
  const name =
    String(
      value ?? "",
    )
      .trim()
      .replace(
        /\s+/g,
        " ",
      );

  if (!name) {
    return "Misafir";
  }

  return name.slice(
    0,
    30,
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
       BODY
    ===================================================== */

    let body:
      CreateChallengeBody;

    try {
      body =
        (await request.json()) as CreateChallengeBody;
    } catch {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçersiz istek verisi.",
        },
        {
          status:
            400,
        },
      );
    }

    /* =====================================================
       GAME VALIDATION
    ===================================================== */

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
          status:
            400,
        },
      );
    }

    /* =====================================================
       PLAYER NAME
    ===================================================== */

    const challengerName =
      sanitizePlayerName(
        body.challengerName,
      );

    if (
      challengerName.length <
      2
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyuncu adı en az 2 karakter olmalı.",
        },
        {
          status:
            400,
        },
      );
    }

    /* =====================================================
       AUTH

       Kullanıcı giriş yapmış olabilir.
       Giriş zorunlu değil.
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await authClient.auth.getUser();

    /*
     * Auth cookie yoksa Supabase burada hata
     * döndürebilir. Guest challenge için bu
     * fatal bir hata değildir.
     */
    if (
      userError &&
      process.env.NODE_ENV !==
        "production"
    ) {
      console.log(
        "Challenge create auth bilgisi alınamadı:",
        userError.message,
      );
    }

    /* =====================================================
       GUEST COOKIE
    ===================================================== */

    const cookieStore =
      await cookies();

    let guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ??
      null;

    /*
     * Kayıtlı kullanıcı değilse browser'ı
     * challenge sahibi olarak tanımak için
     * kalıcı guest id gerekiyor.
     */
    if (
      !user &&
      !guestId
    ) {
      guestId =
        crypto.randomUUID();
    }

    /* =====================================================
       INVITE TOKEN
    ===================================================== */

    const inviteToken =
      generateInviteToken();

    /* =====================================================
       EXPIRATION
    ===================================================== */

    const expiresAt =
      new Date(
        Date.now() +
          CHALLENGE_LIFETIME_HOURS *
            60 *
            60 *
            1000,
      ).toISOString();

    /* =====================================================
       INSERT
    ===================================================== */

    const {
      data:
        challenge,
      error:
        insertError,
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

          /*
           * Giriş yaptıysa UUID burada tutulur.
           */
          challenger_user_id:
            user?.id ??
            null,

          /*
           * Guest ise cookie kimliği burada tutulur.
           */
          challenger_guest_id:
            user
              ? null
              : guestId,

          /*
           * Girişli/girişsiz fark etmeksizin
           * challenge ekranında gösterilecek isim.
           */
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

          opponent_user_id,
          opponent_guest_id,
          opponent_name,

          challenger_score,
          opponent_score,

          winner_side,

          created_at,
          expires_at
        `)
        .single();

    /* =====================================================
       INSERT ERROR
    ===================================================== */

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
            insertError?.message ??
            "Meydan okuma oluşturulamadı.",
        },
        {
          status:
            500,
        },
      );
    }

    /* =====================================================
       SHARE URL
    ===================================================== */

    const requestOrigin =
      new URL(
        request.url,
      ).origin;

    const baseUrl =
      (
        process.env
          .NEXT_PUBLIC_SITE_URL ??
        requestOrigin
      ).replace(
        /\/$/,
        "",
      );

    const sharePath =
      `/challenge/${challenge.invite_token}`;

    const shareUrl =
      `${baseUrl}${sharePath}`;

    /* =====================================================
       RESPONSE
    ===================================================== */

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

          challengerName:
            challenge.challenger_name,

          sharePath,

          shareUrl,

          expiresAt:
            challenge.expires_at,
        },
      });

    /* =====================================================
       SET GUEST COOKIE

       Sadece login olmayan challenge sahibi için.
    ===================================================== */

    if (
      !user &&
      guestId
    ) {
      response.cookies.set(
        GUEST_COOKIE_NAME,
        guestId,
        {
          httpOnly:
            true,

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
        status:
          500,
      },
    );
  }
}