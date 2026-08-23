import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const REQUIRED_COMPLETIONS = 3;
const MAX_HISTORY_DAYS = 400;

type Row = {
  challenge_date: string;
  guess_the_player_completed: boolean;
  player_quiz_completed: boolean;
  tic_tac_toe_completed: boolean;
  wordle_completed: boolean;
};

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function shiftDate(date: string, delta: number) {
  const value = toUtcDate(date);
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}

function isCompleted(row: Row) {
  return [
    row.guess_the_player_completed,
    row.player_quiz_completed,
    row.tic_tac_toe_completed,
    row.wordle_completed,
  ].filter(Boolean).length >= REQUIRED_COMPLETIONS;
}

function getWeekDates(today: string) {
  const date = toUtcDate(today);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = shiftDate(today, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftDate(monday, index));
}

export async function GET() {
  try {
    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("daily_challenge_progress")
      .select("challenge_date,guess_the_player_completed,player_quiz_completed,tic_tac_toe_completed,wordle_completed")
      .eq("user_id", user.id)
      .order("challenge_date", { ascending: false })
      .limit(MAX_HISTORY_DAYS);

    if (error) throw error;

    const rows = (data ?? []) as Row[];
    const completedDates = new Set(rows.filter(isCompleted).map((row) => row.challenge_date));
    const today = getTodayDate();

    let currentStreak = 0;
    let cursor = completedDates.has(today) ? today : shiftDate(today, -1);
    while (completedDates.has(cursor)) {
      currentStreak += 1;
      cursor = shiftDate(cursor, -1);
    }

    const sortedDates = Array.from(completedDates).sort();
    let bestStreak = 0;
    let running = 0;
    let previous: string | null = null;
    for (const date of sortedDates) {
      running = previous && shiftDate(previous, 1) === date ? running + 1 : 1;
      bestStreak = Math.max(bestStreak, running);
      previous = date;
    }

    const week = getWeekDates(today).map((date) => ({
      date,
      completed: completedDates.has(date),
      today: date === today,
      future: date > today,
    }));

    return NextResponse.json({
      ok: true,
      authenticated: true,
      currentStreak,
      bestStreak,
      totalCompletedDays: completedDates.size,
      week,
    });
  } catch (error) {
    console.error("Daily streak GET error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Günlük seri bilgisi alınamadı.",
    }, { status: 500 });
  }
}
