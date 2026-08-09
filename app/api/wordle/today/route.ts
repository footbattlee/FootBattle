import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;

function getLastName(
  nameNormalized: string,
) {
  const parts =
    nameNormalized
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  return (
    parts.at(-1) ??
    ""
  );
}

export async function GET() {
  try {
    /* =====================================================
       1. HAVUZ SAYISI
    ===================================================== */

    const {
      count,
      error: countError,
    } = await supabaseAdmin
      .from("guess_players")
      .select(
        "player_id",
        {
          count: "exact",
          head: true,
        },
      )
      .not(
        "name_normalized",
        "is",
        null,
      );

    if (
      countError ||
      !count
    ) {
      console.error(
        "Wordle oyuncu sayısı okunamadı:",
        countError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Wordle oyuncu havuzu okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       2. RANDOM UYGUN OYUNCU BUL
    ===================================================== */

    let selectedPlayer:
      | {
          player_id: number;
          name: string;
          name_normalized: string;
        }
      | null = null;

    let answer = "";

    /*
     * Çok kısa / çok uzun soyadlarını
     * Wordle için istemiyoruz.
     *
     * 4-10 harf güzel bir aralık.
     */
    for (
      let attempt = 0;
      attempt < 25;
      attempt += 1
    ) {
      const randomIndex =
        Math.floor(
          Math.random() *
            count,
        );

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          name_normalized
        `)
        .not(
          "name_normalized",
          "is",
          null,
        )
        .order(
          "player_id",
          {
            ascending: true,
          },
        )
        .range(
          randomIndex,
          randomIndex,
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (
        !data?.name_normalized
      ) {
        continue;
      }

      const surname =
        getLastName(
          data.name_normalized,
        )
          .toLocaleUpperCase(
            "tr-TR",
          )
          .replace(/İ/g, "I")
          .replace(/Ç/g, "C")
          .replace(/Ğ/g, "G")
          .replace(/Ö/g, "O")
          .replace(/Ş/g, "S")
          .replace(/Ü/g, "U");

      /*
       * Wordle sadece harf.
       */
      if (
        !/^[A-Z]+$/.test(
          surname,
        )
      ) {
        continue;
      }

      if (
        surname.length < 4 ||
        surname.length > 10
      ) {
        continue;
      }

      selectedPlayer = {
        player_id:
          data.player_id,

        name:
          data.name,

        name_normalized:
          data.name_normalized,
      };

      answer =
        surname;

      break;
    }

    if (
      !selectedPlayer ||
      !answer
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Wordle için uygun futbolcu seçilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       3. SESSION
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from(
        "wordle_sessions",
      )
      .insert({
        player_id:
          selectedPlayer.player_id,

        answer_normalized:
          answer,

        letter_count:
          answer.length,

        max_attempts:
          MAX_ATTEMPTS,
      })
      .select(`
        id,
        letter_count,
        max_attempts
      `)
      .single();

    if (
      sessionError ||
      !session
    ) {
      console.error(
        "Wordle session oluşturma hatası:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Yeni Wordle oyunu oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      ok: true,

      sessionId:
        session.id,

      letterCount:
        session.letter_count,

      maxAttempts:
        session.max_attempts,
    });
  } catch (error) {
    console.error(
      "Wordle new game endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Yeni oyun hazırlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}