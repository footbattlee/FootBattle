import { ImageResponse } from "next/og";

import { supabaseAdmin } from "@/lib/supabase/server";

export const alt =
  "FootBattle Halısaha Kadrosu";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType =
  "image/png";

type PlayerPosition = {
  x: number;
  y: number;
};

type ShareRow = {
  id: string;
  squad_name: string;
  player_count: number;
  players: string[];
  body_color: string;
  sleeve_color: string;
  positions: PlayerPosition[];
};

/* =========================================================
   GET SHARE
========================================================= */

async function getShare(
  id: string,
): Promise<ShareRow | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "halisaha_shares",
    )
    .select(`
      id,
      squad_name,
      player_count,
      players,
      body_color,
      sleeve_color,
      positions
    `)
    .eq(
      "id",
      id,
    )
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    console.error(
      "OG halısaha paylaşımı okunamadı:",
      error,
    );

    return null;
  }

  return data as ShareRow;
}

/* =========================================================
   IMAGE
========================================================= */

export default async function Image(
  props: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const {
    id,
  } = await props.params;

  const share =
    await getShare(
      id,
    );

  /* =======================================================
     FALLBACK
  ======================================================= */

  if (!share) {
    return new ImageResponse(
      (
        <div
          style={{
            width:
              "100%",

            height:
              "100%",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            flexDirection:
              "column",

            background:
              "#07111f",

            color:
              "white",
          }}
        >

          <div
            style={{
              fontSize:
                72,

              fontWeight:
                900,
            }}
          >
            Foot
            <span
              style={{
                color:
                  "#facc15",
              }}
            >
              Battle
            </span>
          </div>

          <div
            style={{
              marginTop:
                20,

              fontSize:
                30,

              color:
                "#94a3b8",
            }}
          >
            Halısaha Kadrosu
          </div>

        </div>
      ),
      size,
    );
  }

  const players =
    Array.isArray(
      share.players,
    )
      ? share.players.slice(
          0,
          share.player_count,
        )
      : [];

  const positions =
    Array.isArray(
      share.positions,
    )
      ? share.positions
      : [];

  /* =======================================================
     RESPONSE
  ======================================================= */

  return new ImageResponse(
    (
      <div
        style={{
          width:
            "1200px",

          height:
            "630px",

          display:
            "flex",

          background:
            "#07111f",

          color:
            "white",

          padding:
            "34px",

          fontFamily:
            "Arial",
        }}
      >

        {/* =================================================
            LEFT INFO
        ================================================= */}

        <div
          style={{
            width:
              "440px",

            height:
              "562px",

            display:
              "flex",

            flexDirection:
              "column",

            justifyContent:
              "space-between",

            padding:
              "38px",

            borderRadius:
              "30px",

            border:
              "1px solid rgba(255,255,255,0.12)",

            background:
              "#0d1828",
          }}
        >

          <div
            style={{
              display:
                "flex",

              flexDirection:
                "column",
            }}
          >

            {/* BRAND */}

            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",
              }}
            >

              <div
                style={{
                  width:
                    "64px",

                  height:
                    "64px",

                  borderRadius:
                    "16px",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  background:
                    "#22c55e",

                  color:
                    "#07111f",

                  fontWeight:
                    900,

                  fontSize:
                    24,
                }}
              >
                FB
              </div>

              <div
                style={{
                  marginLeft:
                    "18px",

                  display:
                    "flex",

                  flexDirection:
                    "column",
                }}
              >

                <div
                  style={{
                    fontSize:
                      32,

                    fontWeight:
                      900,
                  }}
                >
                  FootBattle
                </div>

                <div
                  style={{
                    marginTop:
                      "4px",

                    color:
                      "#64748b",

                    fontSize:
                      17,
                  }}
                >
                  Halısaha Kadro
                </div>

              </div>

            </div>

            {/* LABEL */}

            <div
              style={{
                marginTop:
                  "60px",

                color:
                  "#facc15",

                fontSize:
                  18,

                fontWeight:
                  900,

                letterSpacing:
                  "2px",
              }}
            >
              PAYLAŞILAN KADRO
            </div>

            {/* SQUAD */}

            <div
              style={{
                marginTop:
                  "14px",

                fontSize:
                  50,

                lineHeight:
                  1,

                fontWeight:
                  900,

                maxWidth:
                  "350px",
              }}
            >
              {share.squad_name}
            </div>

            <div
              style={{
                marginTop:
                  "18px",

                fontSize:
                  22,

                color:
                  "#94a3b8",
              }}
            >
              {share.player_count}
              {" "}
              kişilik kadro
            </div>

          </div>

          {/* BOTTOM */}

          <div
            style={{
              display:
                "flex",

              flexDirection:
                "column",
            }}
          >

            <div
              style={{
                width:
                  "100%",

                height:
                  "1px",

                background:
                  "rgba(255,255,255,0.08)",
              }}
            />

            <div
              style={{
                marginTop:
                  "22px",

                fontSize:
                  18,

                color:
                  "#94a3b8",
              }}
            >
              Kadroyu görüntülemek için bağlantıya dokun ⚽
            </div>

            <div
              style={{
                marginTop:
                  "10px",

                color:
                  "#22c55e",

                fontSize:
                  18,

                fontWeight:
                  800,
              }}
            >
              foot-battle.vercel.app
            </div>

          </div>

        </div>

        {/* =================================================
            RIGHT PITCH
        ================================================= */}

        <div
          style={{
            marginLeft:
              "30px",

            width:
              "662px",

            height:
              "562px",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            borderRadius:
              "30px",

            border:
              "1px solid rgba(255,255,255,0.12)",

            background:
              "#0d1828",

            padding:
              "18px",
          }}
        >

          <div
            style={{
              position:
                "relative",

              width:
                "395px",

              height:
                "526px",

              display:
                "flex",

              overflow:
                "hidden",

              borderRadius:
                "22px",

              border:
                "5px solid #14532d",

              background:
                "#37a823",
            }}
          >

            {/* =================================================
                PITCH STRIPES
            ================================================= */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "0",

                top:
                  "0",

                width:
                  "25%",

                height:
                  "100%",

                background:
                  "rgba(255,255,255,0.035)",
              }}
            />

            <div
              style={{
                position:
                  "absolute",

                left:
                  "50%",

                top:
                  "0",

                width:
                  "25%",

                height:
                  "100%",

                background:
                  "rgba(255,255,255,0.035)",
              }}
            />

            {/* OUTER LINE */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "14px",

                right:
                  "14px",

                top:
                  "14px",

                bottom:
                  "14px",

                border:
                  "3px solid rgba(255,255,255,0.82)",
              }}
            />

            {/* CENTER LINE */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "14px",

                right:
                  "14px",

                top:
                  "50%",

                height:
                  "3px",

                background:
                  "rgba(255,255,255,0.82)",
              }}
            />

            {/* CENTER CIRCLE */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "50%",

                top:
                  "50%",

                width:
                  "112px",

                height:
                  "112px",

                transform:
                  "translate(-50%, -50%)",

                borderRadius:
                  "999px",

                border:
                  "3px solid rgba(255,255,255,0.82)",
              }}
            />

            {/* CENTER POINT */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "50%",

                top:
                  "50%",

                width:
                  "8px",

                height:
                  "8px",

                transform:
                  "translate(-50%, -50%)",

                borderRadius:
                  "999px",

                background:
                  "white",
              }}
            />

            {/* TOP PENALTY */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "50%",

                top:
                  "14px",

                width:
                  "190px",

                height:
                  "88px",

                transform:
                  "translateX(-50%)",

                borderLeft:
                  "3px solid rgba(255,255,255,0.82)",

                borderRight:
                  "3px solid rgba(255,255,255,0.82)",

                borderBottom:
                  "3px solid rgba(255,255,255,0.82)",
              }}
            />

            {/* TOP SMALL BOX */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "50%",

                top:
                  "14px",

                width:
                  "102px",

                height:
                  "43px",

                transform:
                  "translateX(-50%)",

                borderLeft:
                  "3px solid rgba(255,255,255,0.82)",

                borderRight:
                  "3px solid rgba(255,255,255,0.82)",

                borderBottom:
                  "3px solid rgba(255,255,255,0.82)",
              }}
            />

            {/* BOTTOM PENALTY */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "50%",

                bottom:
                  "14px",

                width:
                  "190px",

                height:
                  "88px",

                transform:
                  "translateX(-50%)",

                borderLeft:
                  "3px solid rgba(255,255,255,0.82)",

                borderRight:
                  "3px solid rgba(255,255,255,0.82)",

                borderTop:
                  "3px solid rgba(255,255,255,0.82)",
              }}
            />

            {/* BOTTOM SMALL BOX */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "50%",

                bottom:
                  "14px",

                width:
                  "102px",

                height:
                  "43px",

                transform:
                  "translateX(-50%)",

                borderLeft:
                  "3px solid rgba(255,255,255,0.82)",

                borderRight:
                  "3px solid rgba(255,255,255,0.82)",

                borderTop:
                  "3px solid rgba(255,255,255,0.82)",
              }}
            />

            {/* WATERMARK */}

            <div
              style={{
                position:
                  "absolute",

                left:
                  "50%",

                top:
                  "50%",

                transform:
                  "translate(-50%, -50%)",

                display:
                  "flex",

                flexDirection:
                  "column",

                alignItems:
                  "center",

                color:
                  "rgba(255,255,255,0.18)",
              }}
            >

              <div
                style={{
                  fontSize:
                    38,

                  fontWeight:
                    900,

                  fontStyle:
                    "italic",
                }}
              >
                FootBattle
              </div>

            </div>

            {/* =================================================
                PLAYERS
            ================================================= */}

            {players.map(
              (
                player,
                index,
              ) => {
                const position =
                  positions[
                    index
                  ] ?? {
                    x:
                      50,

                    y:
                      50,
                  };

                return (
                  <div
                    key={
                      index
                    }
                    style={{
                      position:
                        "absolute",

                      left:
                        `${position.x}%`,

                      top:
                        `${position.y}%`,

                      transform:
                        "translate(-50%, -50%)",

                      display:
                        "flex",

                      flexDirection:
                        "column",

                      alignItems:
                        "center",

                      zIndex:
                        10,
                    }}
                  >

                    {/* JERSEY */}

                    <div
                      style={{
                        position:
                          "relative",

                        width:
                          "48px",

                        height:
                          "42px",

                        display:
                          "flex",
                      }}
                    >

                      {/* LEFT SLEEVE */}

                      <div
                        style={{
                          position:
                            "absolute",

                          left:
                            "0",

                          top:
                            "7px",

                          width:
                            "15px",

                          height:
                            "19px",

                          borderRadius:
                            "5px",

                          transform:
                            "rotate(-18deg)",

                          background:
                            share.sleeve_color,

                          border:
                            "1px solid rgba(0,0,0,0.30)",
                        }}
                      />

                      {/* RIGHT SLEEVE */}

                      <div
                        style={{
                          position:
                            "absolute",

                          right:
                            "0",

                          top:
                            "7px",

                          width:
                            "15px",

                          height:
                            "19px",

                          borderRadius:
                            "5px",

                          transform:
                            "rotate(18deg)",

                          background:
                            share.sleeve_color,

                          border:
                            "1px solid rgba(0,0,0,0.30)",
                        }}
                      />

                      {/* BODY */}

                      <div
                        style={{
                          position:
                            "absolute",

                          left:
                            "50%",

                          top:
                            "2px",

                          width:
                            "30px",

                          height:
                            "36px",

                          transform:
                            "translateX(-50%)",

                          borderRadius:
                            "4px 4px 8px 8px",

                          background:
                            share.body_color,

                          border:
                            "1px solid rgba(0,0,0,0.35)",

                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          color:
                            "white",

                          fontSize:
                            16,

                          fontWeight:
                            900,
                        }}
                      >
                        {index + 1}
                      </div>

                    </div>

                    {/* NAME */}

                    <div
                      style={{
                        marginTop:
                          "1px",

                        padding:
                          "4px 8px",

                        maxWidth:
                          "105px",

                        borderRadius:
                          "6px",

                        background:
                          "rgba(7,17,31,0.93)",

                        border:
                          "1px solid rgba(255,255,255,0.14)",

                        color:
                          "white",

                        fontSize:
                          12,

                        fontWeight:
                          800,

                        whiteSpace:
                          "nowrap",

                        overflow:
                          "hidden",

                        textOverflow:
                          "ellipsis",
                      }}
                    >
                      {player?.trim() ||
                        `Oyuncu ${
                          index +
                          1
                        }`}
                    </div>

                  </div>
                );
              },
            )}

          </div>

        </div>

      </div>
    ),
    size,
  );
}