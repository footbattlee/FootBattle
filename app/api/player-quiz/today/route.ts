import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LIVES = 5;
const GUESS_TIME_SECONDS = 20;
const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_POPULARITY_SCORE = 72;

type CandidatePlayer = {
  player_id: number;
  name: string;
  image_url: string | null;
  nationality: string | null;
  popularity_score: number | null;
};

export async function GET() {
  try {
    /*
     * Önce yeterince bilinen ve oynanabilir oyuncuları alıyoruz.
     */
    const { data: candidates, error: candidatesError } =
      await supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          image_url,
          nationality,
          popularity_score
        `)
        .eq("is_playable", 1)
        .gte("popularity_score", MINIMUM_POPULARITY_SCORE)
        .not("nationality", "is", null)
        .order("popularity_score", {
          ascending: false,
          nullsFirst: false,
        });

    if (candidatesError) {
      console.error(
        "Player Quiz oyuncu havuzu okunamadı:",
        candidatesError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu havuzu okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Player Quiz için uygun oyuncu bulunamadı.",
        },
        { status: 404 },
      );
    }

    /*
     * Listeyi rastgele sıraya sokuyoruz.
     * Uygun detay/kulüp bilgisi olan ilk oyuncuyu seçiyoruz.
     */
    const shuffled = [...candidates].sort(
      () => Math.random() - 0.5,
    );

    let selectedPlayer: CandidatePlayer | null = null;
    let selectedBirthYear: number | null = null;
    let selectedClubs:
      | {
          id: number;
          club_name: string;
          career_order: number;
        }[]
      | null = null;

    for (const candidate of shuffled.slice(0, 100)) {
      const [detailResult, clubsResult] =
        await Promise.all([
          supabaseAdmin
            .from("player_quiz_details")
            .select("birth_year")
            .eq("player_id", candidate.player_id)
            .maybeSingle(),

          supabaseAdmin
            .from("player_quiz_clubs")
            .select("id, club_name, career_order")
            .eq("player_id", candidate.player_id)
            .order("career_order", {
              ascending: true,
            }),
        ]);

      if (
        detailResult.error ||
        clubsResult.error
      ) {
        continue;
      }

      const birthYear =
        detailResult.data?.birth_year ?? null;

      const clubs = clubsResult.data ?? [];

      if (
        birthYear &&
        candidate.nationality?.trim() &&
        clubs.length > 0
      ) {
        selectedPlayer = candidate;
        selectedBirthYear = Number(birthYear);
        selectedClubs = clubs;

        break;
      }
    }

    if (
      !selectedPlayer ||
      !selectedBirthYear ||
      !selectedClubs
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Player Quiz için gerekli bilgileri tamamlanmış uygun oyuncu seçilemedi.",
        },
        { status: 404 },
      );
    }

    /*
     * Yeni sınırsız oyun session'ı oluştur.
     */
    const { data: session, error: sessionError } =
      await supabaseAdmin
        .from("player_quiz_sessions")
        .insert({
          player_id: selectedPlayer.player_id,
          max_lives: MAX_LIVES,
          guess_time_seconds: GUESS_TIME_SECONDS,
        })
        .select(`
          id,
          max_lives,
          guess_time_seconds
        `)
        .single();

    if (sessionError || !session) {
      console.error(
        "Player Quiz session oluşturulamadı:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Yeni Player Quiz oyunu oluşturulamadı.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,

      sessionId: session.id,

      player: {
        id: Number(selectedPlayer.player_id),
        fullName: selectedPlayer.name,
        imageUrl: selectedPlayer.image_url ?? null,
      },

      maxLives: session.max_lives,
      guessTimeSeconds: session.guess_time_seconds,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,

      board: {
        birthYearSlots: 1,
        nationalitySlots: 1,
        clubSlots: selectedClubs.length,

        /*
         * Trophy artık yok.
         */
        totalSlots: selectedClubs.length + 2,
      },

      scoring: {
        completionScore: 500,
      },
    });
  } catch (error) {
    console.error(
      "Player Quiz today endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Yeni Player Quiz hazırlanırken hata oluştu.",
      },
      { status: 500 },
    );
  }
}