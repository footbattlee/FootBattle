import { ImageResponse } from "next/og";

import { supabaseAdmin } from "@/lib/supabase/server";

export const alt = "FootBattle Halısaha Kadrosu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

type PlayerPosition = { x: number; y: number };

type ShareRow = {
  id: string;
  squad_name: string;
  player_count: number;
  players: string[];
  body_color: string;
  sleeve_color: string;
  positions: PlayerPosition[];
};

async function getShare(id: string): Promise<ShareRow | null> {
  const { data, error } = await supabaseAdmin
    .from("halisaha_shares")
    .select("id,squad_name,player_count,players,body_color,sleeve_color,positions")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ShareRow;
}

function safeName(value: string | undefined, index: number) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.slice(0, 14) : `Oyuncu ${index + 1}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getShare(id);

  if (!share) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07111f",
          color: "white",
          fontSize: 64,
          fontWeight: 900,
        }}
      >
        FootBattle ⚽
      </div>,
      size,
    );
  }

  const players = Array.isArray(share.players)
    ? share.players.slice(0, share.player_count)
    : [];
  const positions = Array.isArray(share.positions) ? share.positions : [];

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        background: "#07111f",
        color: "white",
        padding: "34px",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: "330px",
          height: "562px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "28px",
          borderRadius: "24px",
          background: "#0d1828",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 900,
              color: "#5ee6a8",
              letterSpacing: "1px",
            }}
          >
            FOOTBATTLE
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "12px",
              fontSize: 13,
              color: "#8291a7",
              letterSpacing: "1px",
            }}
          >
            HALISAHA KADROSU
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "46px",
              fontSize: share.squad_name.length > 18 ? 34 : 42,
              lineHeight: 1.05,
              fontWeight: 900,
            }}
          >
            {share.squad_name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "18px",
              width: "fit-content",
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(250,204,21,0.12)",
              color: "#facc15",
              fontSize: 17,
              fontWeight: 900,
            }}
          >
            ⚽ {share.player_count} KİŞİ
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              height: "2px",
              width: "100%",
              background: "#31d98b",
            }}
          />
          <div
            style={{
              display: "flex",
              marginTop: "14px",
              fontSize: 15,
              color: "#a7b3c4",
            }}
          >
            Kadroyu açmak için bağlantıya dokun.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "8px",
              fontSize: 13,
              color: "#5ee6a8",
            }}
          >
            playfootbattle.com
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          height: "562px",
          marginLeft: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "24px",
          background: "#0a1725",
          border: "1px solid rgba(34,197,94,0.18)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "390px",
            height: "520px",
            display: "flex",
            overflow: "hidden",
            borderRadius: "18px",
            background: "#36a626",
            border: "5px solid #14532d",
          }}
        >
          {[0, 2, 4, 6].map((stripe) => (
            <div
              key={stripe}
              style={{
                position: "absolute",
                left: `${stripe * 12.5}%`,
                top: 0,
                width: "12.5%",
                height: "100%",
                background: "rgba(255,255,255,0.055)",
              }}
            />
          ))}

          <div
            style={{
              position: "absolute",
              left: "16px",
              right: "16px",
              top: "16px",
              bottom: "16px",
              border: "3px solid rgba(255,255,255,0.82)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "16px",
              right: "16px",
              top: "50%",
              height: "3px",
              background: "rgba(255,255,255,0.82)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "118px",
              height: "118px",
              transform: "translate(-50%, -50%)",
              borderRadius: "999px",
              border: "3px solid rgba(255,255,255,0.82)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "16px",
              width: "190px",
              height: "88px",
              transform: "translateX(-50%)",
              borderLeft: "3px solid rgba(255,255,255,0.82)",
              borderRight: "3px solid rgba(255,255,255,0.82)",
              borderBottom: "3px solid rgba(255,255,255,0.82)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "16px",
              width: "190px",
              height: "88px",
              transform: "translateX(-50%)",
              borderLeft: "3px solid rgba(255,255,255,0.82)",
              borderRight: "3px solid rgba(255,255,255,0.82)",
              borderTop: "3px solid rgba(255,255,255,0.82)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%) rotate(-18deg)",
              display: "flex",
              fontSize: 46,
              fontWeight: 900,
              color: "rgba(255,255,255,0.12)",
            }}
          >
            FootBattle
          </div>

          {players.map((player, index) => {
            const position = positions[index] ?? { x: 50, y: 50 };
            return (
              <div
                key={`${index}-${player}`}
                style={{
                  position: "absolute",
                  left: `${Math.min(92, Math.max(8, Number(position.x) || 50))}%`,
                  top: `${Math.min(92, Math.max(8, Number(position.y) || 50))}%`,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "54px",
                    height: "54px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "15px",
                    background: share.body_color || "#c8101e",
                    color: "white",
                    border: `5px solid ${share.sleeve_color || "#ffffff"}`,
                    fontSize: 22,
                    fontWeight: 900,
                    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
                  }}
                >
                  {index + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: "4px",
                    maxWidth: "105px",
                    padding: "4px 8px",
                    borderRadius: "7px",
                    background: "#07111f",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  {safeName(player, index)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    size,
  );
}
