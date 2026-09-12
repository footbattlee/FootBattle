import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CompetitionKey = "super-lig" | "premier-league" | "la-liga" | "serie-a" | "bundesliga" | "ligue-1" | "primeira-liga" | "champions-league" | "europa-league" | "conference-league";

type PredictionRow = {
  id: string;
  competition: CompetitionKey;
  match_id: string;
  kickoff_at: string;
  status: "pending" | "settled" | "void";
};

const ESPN_SLUGS: Record<CompetitionKey, string> = {
  "super-lig": "tur.1",
  "premier-league": "eng.1",
  "la-liga": "esp.1",
  "serie-a": "ita.1",
  "bundesliga": "ger.1",
  "ligue-1": "fra.1",
  "primeira-liga": "por.1",
  "champions-league": "uefa.champions",
  "europa-league": "uefa.europa",
  "conference-league": "uefa.europa.conf",
};

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const SEASON_RANGE = "20260701-20270630";

function isCompetition(value: string): value is CompetitionKey {
  return value in ESPN_SLUGS;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "MISSING_ENV" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("match_predictions")
    .select("id,competition,match_id,kickoff_at,status")
    .eq("status", "pending")
    .lte("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(1000);

  if (error) return json({ ok: false, error: "DB_READ_FAILED", detail: error.message }, 500);

  const rows = (data ?? []).filter((row): row is PredictionRow => isCompetition(String(row.competition)));
  const byCompetition = new Map<CompetitionKey, PredictionRow[]>();
  for (const row of rows) {
    const list = byCompetition.get(row.competition) ?? [];
    list.push(row);
    byCompetition.set(row.competition, list);
  }

  let settled = 0;
  let voided = 0;
  let rescheduled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [competition, predictionRows] of byCompetition) {
    try {
      const url = `${ESPN_BASE}/${ESPN_SLUGS[competition]}/scoreboard?dates=${SEASON_RANGE}&limit=500`;
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`ESPN_${response.status}`);
      const payload = await response.json() as { events?: Array<any> };
      const events = new Map((payload.events ?? []).map((event) => [String(event.id ?? ""), event]));

      for (const row of predictionRows) {
        const event = events.get(row.match_id);
        if (!event) { skipped += 1; continue; }

        const state = String(event?.status?.type?.state ?? "");
        const statusName = String(event?.status?.type?.name ?? "").toUpperCase();
        const statusText = String(event?.status?.type?.detail ?? event?.status?.type?.shortDetail ?? "").toLowerCase();
        const eventDate = typeof event?.date === "string" ? event.date : null;

        const canceled = statusName.includes("CANCEL") || statusName.includes("ABANDON") || statusText.includes("cancel") || statusText.includes("iptal") || statusText.includes("abandon");
        if (canceled) {
          const { error: voidError } = await supabase
            .from("match_predictions")
            .update({ status: "void", xp_awarded: 0, updated_at: nowIso, settled_at: nowIso })
            .eq("id", row.id)
            .eq("status", "pending");
          if (voidError) errors.push(`${row.id}:VOID:${voidError.message}`); else voided += 1;
          continue;
        }

        if (state !== "post") {
          if (eventDate) {
            const currentKickoff = new Date(row.kickoff_at).getTime();
            const authoritativeKickoff = new Date(eventDate).getTime();
            if (Number.isFinite(authoritativeKickoff) && authoritativeKickoff > Date.now() && Math.abs(authoritativeKickoff - currentKickoff) > 60_000) {
              const { error: updateError } = await supabase
                .from("match_predictions")
                .update({ kickoff_at: eventDate, updated_at: nowIso })
                .eq("id", row.id)
                .eq("status", "pending");
              if (updateError) errors.push(`${row.id}:RESCHEDULE:${updateError.message}`); else rescheduled += 1;
            } else {
              skipped += 1;
            }
          } else {
            skipped += 1;
          }
          continue;
        }

        const competitors = event?.competitions?.[0]?.competitors ?? [];
        const home = competitors.find((item: any) => item?.homeAway === "home");
        const away = competitors.find((item: any) => item?.homeAway === "away");
        const actualHome = Number(home?.score);
        const actualAway = Number(away?.score);
        if (!Number.isInteger(actualHome) || !Number.isInteger(actualAway)) { skipped += 1; continue; }

        const { error: settleError } = await supabase.rpc("footbattle_settle_match_prediction", {
          p_prediction_id: row.id,
          p_actual_home: actualHome,
          p_actual_away: actualAway,
        });
        if (settleError) errors.push(`${row.id}:SETTLE:${settleError.message}`); else settled += 1;
      }
    } catch (reason) {
      errors.push(`${competition}:${reason instanceof Error ? reason.message : "UNKNOWN"}`);
    }
  }

  return json({ ok: errors.length === 0, checked: rows.length, settled, voided, rescheduled, skipped, errors: errors.slice(0, 20), ranAt: nowIso }, errors.length ? 207 : 200);
});
