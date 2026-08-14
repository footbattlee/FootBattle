import { ImageResponse } from "next/og";

import { extractPublicMatchId, type MatchRow } from "@/lib/halisaha/match";
import { supabaseAdmin } from "@/lib/supabase/server";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeValue } = await params;
  const id = extractPublicMatchId(routeValue);
  const { data } = await supabaseAdmin
    .from("halisaha_matches")
    .select("id,title,match_date,match_time,location,target_players,note,created_at")
    .eq("id", id)
    .maybeSingle();

  const match = (data ?? null) as MatchRow | null;
  const date = match
    ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(
        new Date(`${match.match_date}T12:00:00`),
      )
    : "Halısaha Maçı";
  const time = match?.match_time.slice(0, 5) ?? "--:--";
  const location = match?.location || "Saha bilgisi";
  const title = match?.title || "FootBattle Halısaha";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #07111f 0%, #0d1828 60%, #10261c 100%)",
          color: "white",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 34, fontWeight: 900, fontStyle: "italic" }}>
            Foot<span style={{ color: "#facc15" }}>Battle</span>
          </div>
          <div
            style={{
              display: "flex",
              border: "2px solid rgba(74,222,128,.35)",
              background: "rgba(74,222,128,.08)",
              color: "#4ade80",
              padding: "12px 20px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            ⚽ Halısaha Maçı
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, lineHeight: 1.02, fontWeight: 900, maxWidth: 1000 }}>{title}</div>
          <div style={{ display: "flex", gap: 18, marginTop: 38, flexWrap: "wrap" }}>
            <Info value={`📅 ${date}`} />
            <Info value={`🕘 ${time}`} />
            <Info value={`📍 ${location}`} />
            {match ? <Info value={`👥 ${match.target_players} kişilik`} /> : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,.12)",
            paddingTop: 26,
            fontSize: 24,
          }}
        >
          <span style={{ color: "#cbd5e1" }}>Katılıyor musun? Linke dokun, durumunu bildir.</span>
          <span style={{ color: "#facc15", fontWeight: 800 }}>foot-battle.vercel.app</span>
        </div>
      </div>
    ),
    size,
  );
}

function Info({ value }: { value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.12)",
        padding: "16px 22px",
        borderRadius: 18,
        fontSize: 26,
        fontWeight: 700,
      }}
    >
      {value}
    </div>
  );
}
