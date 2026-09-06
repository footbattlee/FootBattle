import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;
const MINIMUM_POPULARITY_SCORE = 84;
const WORDLE_POOL_CACHE_TTL_MS = 5 * 60 * 1000;
const PLAYER_PAGE_SIZE = 1000;

type WordlePlayer = {
  player_id: number;
  name: string;
  name_normalized: string;
  popularity_score: number | null;
};

type WordleCandidate = WordlePlayer & {
  answer: string;
};

type WordlePoolCache = {
  expiresAt: number;
  players: WordleCandidate[];
};

let wordlePoolCache: WordlePoolCache | null = null;

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getLastName(nameNormalized: string) {
  const parts = nameNormalized.trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? "";
}

function normalizeSurname(nameNormalized: string) {
  return getLastName(nameNormalized)
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

function validWordleSurname(nameNormalized: string) {
  const surname = normalizeSurname(nameNormalized);
  if (!/^[A-Z]+$/.test(surname)) return null;
  if (surname.length < 4 || surname.length > 10) return null;
  return surname;
}

async function getWordlePool() {
  const now = Date.now();
  if (wordlePoolCache && wordlePoolCache.expiresAt > now) return wordlePoolCache.players;

  const players: WordleCandidate[] = [];
  let from = 0;

  while (true) {
    const to = from + PLAYER_PAGE_SIZE - 1;
    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, name_normalized, popularity_score")
      .eq("is_playable", 1)
      .gte("popularity_score", MINIMUM_POPULARITY_SCORE)
      .not("name_normalized", "is", null)
      .order("player_id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const rows = (data ?? []) as WordlePlayer[];
    for (const row of rows) {
      if (!row.name_normalized) continue;
      const answer = validWordleSurname(row.name_normalized);
      if (!answer) continue;
      players.push({ ...row, answer });
    }

    if (rows.length < PLAYER_PAGE_SIZE) break;
    from += PLAYER_PAGE_SIZE;
    if (from > 100_000) break;
  }

  wordlePoolCache = {
    expiresAt: now + WORDLE_POOL_CACHE_TTL_MS,
    players,
  };

  return players;
}

function randomCandidate(players: WordleCandidate[]) {
  if (!players.length) return null;
  return players[Math.floor(Math.random() * players.length)] ?? null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dailyMode = url.searchParams.get("daily") === "1";
    const challengeSessionId = url.searchParams.get("challenge")?.trim() || null;

    let selectedPlayer: WordlePlayer | null = null;
    let answer = "";

    if (challengeSessionId) {
      const { data: sourceSession, error: sourceSessionError } = await supabaseAdmin
        .from("wordle_sessions")
        .select("player_id")
        .eq("id", challengeSessionId)
        .maybeSingle();

      if (sourceSessionError || !sourceSession?.player_id) {
        console.error("Paylaşılan Wordle oturumu okunamadı:", sourceSessionError);
        return NextResponse.json({ ok: false, error: "Paylaşılan Wordle oyunu bulunamadı." }, { status: 404 });
      }

      const { data: challengePlayer, error: challengePlayerError } = await supabaseAdmin
        .from("guess_players")
        .select("player_id, name, name_normalized, popularity_score")
        .eq("player_id", sourceSession.player_id)
        .eq("is_playable", 1)
        .maybeSingle();

      if (challengePlayerError || !challengePlayer?.name_normalized) {
        console.error("Paylaşılan Wordle oyuncusu okunamadı:", challengePlayerError);
        return NextResponse.json({ ok: false, error: "Paylaşılan Wordle oyuncusu bulunamadı." }, { status: 404 });
      }

      const surname = validWordleSurname(challengePlayer.name_normalized);
      if (!surname) {
        return NextResponse.json({ ok: false, error: "Paylaşılan Wordle oyuncusu Wordle kurallarına uygun değil." }, { status: 422 });
      }

      selectedPlayer = {
        player_id: Number(challengePlayer.player_id),
        name: challengePlayer.name,
        name_normalized: challengePlayer.name_normalized,
        popularity_score: challengePlayer.popularity_score === null ? null : Number(challengePlayer.popularity_score),
      };
      answer = surname;
    } else if (dailyMode) {
      const playDate = getTurkeyDateKey();
      const { data: dailyRow, error: dailyError } = await supabaseAdmin
        .from("daily_wordle")
        .select("player_id, is_published")
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

      if (dailyError) {
        console.error("Daily Wordle okunamadı:", dailyError);
        return NextResponse.json({ ok: false, error: "Bugünün Wordle bilgisi okunamadı." }, { status: 500 });
      }

      if (!dailyRow) {
        return NextResponse.json({ ok: false, error: "Bugünün Wordle oyunu henüz yayınlanmadı." }, { status: 404 });
      }

      const { data: dailyPlayer, error: playerError } = await supabaseAdmin
        .from("guess_players")
        .select("player_id, name, name_normalized, popularity_score")
        .eq("player_id", dailyRow.player_id)
        .eq("is_playable", 1)
        .maybeSingle();

      if (playerError || !dailyPlayer || !dailyPlayer.name_normalized) {
        console.error("Daily Wordle oyuncusu okunamadı:", playerError);
        return NextResponse.json({ ok: false, error: "Bugünün Wordle oyuncusu bulunamadı." }, { status: 404 });
      }

      const surname = validWordleSurname(dailyPlayer.name_normalized);
      if (!surname) {
        return NextResponse.json({ ok: false, error: "Admin tarafından seçilen Wordle oyuncusunun soyadı Wordle kurallarına uygun değil." }, { status: 422 });
      }

      selectedPlayer = {
        player_id: Number(dailyPlayer.player_id),
        name: dailyPlayer.name,
        name_normalized: dailyPlayer.name_normalized,
        popularity_score: dailyPlayer.popularity_score === null ? null : Number(dailyPlayer.popularity_score),
      };
      answer = surname;
    } else {
      const candidate = randomCandidate(await getWordlePool());
      if (candidate) {
        selectedPlayer = candidate;
        answer = candidate.answer;
      }
    }

    if (!selectedPlayer || !answer) {
      return NextResponse.json({ ok: false, error: "Wordle için uygun futbolcu seçilemedi." }, { status: 500 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("wordle_sessions")
      .insert({
        player_id: selectedPlayer.player_id,
        answer_normalized: answer,
        letter_count: answer.length,
        max_attempts: MAX_ATTEMPTS,
      })
      .select("id, letter_count, max_attempts")
      .single();

    if (sessionError || !session) {
      console.error("Wordle session oluşturma hatası:", sessionError);
      return NextResponse.json({ ok: false, error: "Yeni Wordle oyunu oluşturulamadı." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      mode: challengeSessionId ? "challenge" : dailyMode ? "daily" : "random",
      daily: dailyMode,
      sessionId: session.id,
      letterCount: session.letter_count,
      maxAttempts: session.max_attempts,
      minimumPopularityScore: MINIMUM_POPULARITY_SCORE,
    });
  } catch (error) {
    console.error("Wordle new game endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Yeni oyun hazırlanırken hata oluştu." }, { status: 500 });
  }
}
