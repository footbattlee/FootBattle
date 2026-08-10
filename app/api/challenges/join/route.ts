import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME =
  "footbattle_guest";

type JoinChallengeBody = {
  token?: string;
  opponentName?: string;
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

  challenger_name:
    | string
    | null;

  opponent_user_id:
    | string
    | null;

  opponent_guest_id:
    | string
    | null;

  opponent_name:
    | string
    | null;

  challenger_score: number;
  opponent_score: number;

  winner_side:
    | "challenger"
    | "opponent"
    | "draw"
    | null;

  created_at: string;
  joined_at:
    | string
    | null;

  started_at:
    | string
    | null;

  completed_at:
    | string
    | null;

  expires_at: string;
  updated_at: string;
};

function sanitizeName(
  value: unknown,
) {
  const name =
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");

  if (!name) {
    return "Misafir";
  }

  return name.slice(
    0,
    30,
  );
}

function sanitizeToken(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .replace(
      /[^a-zA-Z0-9]/g,
      "",
    )
    .slice(
      0,
      64,
    );
}

function isExpired(
  expiresAt: string,
) {
  const time =
    new Date(
      expiresAt,
    ).getTime();

  if (
    Number.isNaN(time)
  ) {
    return false;
  }

  return (
    time <=
    Date.now()
  );
}

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       BODY
    ===================================================== */

    const body =
      (await request.json()) as JoinChallengeBody;

    const token =
      sanitizeToken(
        body.token,
      );

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli bir meydan okuma bağlantısı bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       CURRENT USER
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authClient.auth.getUser();

    /* =====================================================
       GUEST ID
    ===================================================== */

    const cookieStore =
      await cookies();

    let guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ??
      null;

    /*
     * Kullanıcı login değilse
     * guest identity gerekiyor.
     */
    if (
      !user &&
      !guestId
    ) {
      guestId =
        crypto.randomUUID();
    }

    /* =====================================================
       READ CHALLENGE
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
          challenger_name,

          opponent_user_id,
          opponent_guest_id,
          opponent_name,

          challenger_score,
          opponent_score,
          winner_side,

          created_at,
          joined_at,
          started_at,
          completed_at,
          expires_at,
          updated_at
        `)
        .eq(
          "invite_token",
          token,
        )
        .maybeSingle();

    if (
      challengeError
    ) {
      console.error(
        "Challenge join sorgu hatası:",
        challengeError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Meydan okuma okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !challengeData
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu meydan okuma bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    /* =====================================================
       EXPIRED?
    ===================================================== */

    if (
      isExpired(
        challenge.expires_at,
      )
    ) {
      if (
        challenge.status ===
        "waiting"
      ) {
        await supabaseAdmin
          .from(
            "guest_challenges",
          )
          .update({
            status:
              "expired",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            challenge.id,
          )
          .eq(
            "status",
            "waiting",
          );
      }

      return NextResponse.json(
        {
          ok: false,

          expired:
            true,

          error:
            "Bu meydan okumanın süresi dolmuş.",
        },
        {
          status: 410,
        },
      );
    }

    /* =====================================================
       CANCELLED / EXPIRED
    ===================================================== */

    if (
      challenge.status ===
        "cancelled" ||
      challenge.status ===
        "expired"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            challenge.status ===
            "expired"
              ? "Bu meydan okumanın süresi dolmuş."
              : "Bu meydan okuma iptal edilmiş.",
        },
        {
          status: 410,
        },
      );
    }

    /* =====================================================
       IS CURRENT VISITOR THE CHALLENGER?
    ===================================================== */

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

    if (
      isChallenger
    ) {
      return NextResponse.json(
        {
          ok: true,

          role:
            "challenger",

          alreadyJoined:
            true,

          message:
            "Bu meydan okumayı sen oluşturdun.",

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

            opponentName:
              challenge.opponent_name,

            expiresAt:
              challenge.expires_at,
          },
        },
      );
    }

    /* =====================================================
       IS CURRENT VISITOR ALREADY THE OPPONENT?
    ===================================================== */

    const isExistingOpponent =
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
      isExistingOpponent
    ) {
      const response =
        NextResponse.json({
          ok: true,

          role:
            "opponent",

          alreadyJoined:
            true,

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

            opponentName:
              challenge.opponent_name,

            expiresAt:
              challenge.expires_at,
          },
        });

      /*
       * Guest cookie yokken guest oluşturduysak
       * response'a ekle.
       */
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
    }

    /* =====================================================
       CHALLENGE ALREADY FULL?
    ===================================================== */

    const hasOpponent =
      Boolean(
        challenge.opponent_user_id ||
          challenge.opponent_guest_id,
      );

    if (
      hasOpponent ||
      challenge.status !==
        "waiting"
    ) {
      return NextResponse.json(
        {
          ok: false,

          full:
            true,

          error:
            "Bu meydan okumaya başka bir oyuncu zaten katılmış.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       JOIN
    ===================================================== */

    const now =
      new Date().toISOString();

    const opponentName =
      user
        ? null
        : sanitizeName(
            body.opponentName,
          );

    /*
     * ÖNEMLİ:
     *
     * Hem status = waiting kontrol ediyoruz
     * hem de opponent alanlarının boş olduğunu
     * garanti ediyoruz.
     *
     * Böylece iki kişi aynı anda join'e basarsa
     * ilk başarılı update rakibi alır.
     */
    let updateQuery =
      supabaseAdmin
        .from(
          "guest_challenges",
        )
        .update({
          opponent_user_id:
            user?.id ??
            null,

          opponent_guest_id:
            user
              ? null
              : guestId,

          opponent_name:
            opponentName,

          status:
            "ready",

          joined_at:
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
          "waiting",
        )
        .is(
          "opponent_user_id",
          null,
        )
        .is(
          "opponent_guest_id",
          null,
        );

    const {
      data:
        updatedChallengeData,

      error:
        updateError,
    } =
      await updateQuery
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
          joined_at,
          started_at,
          completed_at,
          expires_at,
          updated_at
        `)
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Challenge join update hatası:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Meydan okumaya katılınamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Update satır döndürmediyse
     * başka bir oyuncu milisaniyeler önce
     * koltuğu kapmış olabilir.
     */
    if (
      !updatedChallengeData
    ) {
      return NextResponse.json(
        {
          ok: false,

          full:
            true,

          error:
            "Bu meydan okumaya başka bir oyuncu senden önce katıldı.",
        },
        {
          status: 409,
        },
      );
    }

    const updatedChallenge =
      updatedChallengeData as ChallengeRow;

    /* =====================================================
       RESPONSE
    ===================================================== */

    const response =
      NextResponse.json({
        ok: true,

        role:
          "opponent",

        alreadyJoined:
          false,

        message:
          "Meydan okumaya katıldın.",

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

          challengerName:
            updatedChallenge.challenger_name,

          opponentName:
            updatedChallenge.opponent_name,

          challengerScore:
            Number(
              updatedChallenge.challenger_score,
            ),

          opponentScore:
            Number(
              updatedChallenge.opponent_score,
            ),

          joinedAt:
            updatedChallenge.joined_at,

          expiresAt:
            updatedChallenge.expires_at,
        },
      });

    /* =====================================================
       SAVE GUEST COOKIE
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
      "Challenge join endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Meydan okumaya katılırken beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}