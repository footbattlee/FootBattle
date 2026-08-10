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

export const runtime =
  "nodejs";

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
    .from("halisaha_shares")
    .select(`
      id,
      squad_name,
      player_count,
      players,
      body_color,
      sleeve_color,
      positions
    `)
    .eq("id", id)
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
   HELPERS
========================================================= */

function cleanPlayerName(
  value: string | null | undefined,
  index: number,
) {
  const name =
    String(value ?? "").trim();

  if (!name) {
    return `Oyuncu ${index + 1}`;
  }

  /*
   * WhatsApp preview içinde çok uzun isimler
   * formaların birbirine girmesine sebep olmasın.
   */
  if (name.length > 14) {
    return `${name.slice(0, 12)}…`;
  }

  return name;
}

/* =========================================================
   IMAGE
========================================================= */

export default async function Image({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id,
  } = await params;

  const share =
    await getShare(id);

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
              "#ffffff",

            fontFamily:
              "Arial",
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

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
                  "#22c55e",
              }}
            >
              Battle
            </span>
          </div>

          <div
            style={{
              display:
                "flex",

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
      {
        ...size,
      },
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

          flexDirection:
            "column",

          background:
            "#07111f",

          color:
            "#ffffff",

          fontFamily:
            "Arial",
        }}
      >
        {/* =================================================
            TOP BRAND BAR
        ================================================= */}

        <div
          style={{
            height:
              "92px",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            padding:
              "0 42px",

            borderBottom:
              "1px solid rgba(255,255,255,0.10)",

            background:
              "#091625",
          }}
        >
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
                  "54px",

                height:
                  "54px",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                borderRadius:
                  "14px",

                background:
                  "#22c55e",

                color:
                  "#07111f",

                fontSize:
                  21,

                fontWeight:
                  900,
              }}
            >
              FB
            </div>

            <div
              style={{
                display:
                  "flex",

                flexDirection:
                  "column",

                marginLeft:
                  "16px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  fontSize:
                    29,

                  fontWeight:
                    900,
                }}
              >
                FootBattle
              </div>

              <div
                style={{
                  display:
                    "flex",

                  marginTop:
                    "2px",

                  fontSize:
                    15,

                  fontWeight:
                    700,

                  color:
                    "#22c55e",

                  letterSpacing:
                    "1.4px",
                }}
              >
                HALISAHA KADROM
              </div>
            </div>
          </div>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              padding:
                "10px 18px",

              borderRadius:
                "999px",

              border:
                "1px solid rgba(250,204,21,0.25)",

              background:
                "rgba(250,204,21,0.08)",

              color:
                "#facc15",

              fontSize:
                16,

              fontWeight:
                800,
            }}
          >
            ⚽ {share.player_count} KİŞİLİK KADRO
          </div>
        </div>

        {/* =================================================
            MAIN
        ================================================= */}

        <div
          style={{
            flex:
              1,

            display:
              "flex",

            padding:
              "26px 38px 30px 38px",
          }}
        >
          {/* =================================================
              LEFT INFO
          ================================================= */}

          <div
            style={{
              width:
                "300px",

              display:
                "flex",

              flexDirection:
                "column",

              justifyContent:
                "space-between",

              padding:
                "30px 24px",

              border:
                "1px solid rgba(255,255,255,0.10)",

              borderRadius:
                "24px",

              background:
                "#0d1a2a",
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
              <div
                style={{
                  display:
                    "flex",

                  fontSize:
                    14,

                  fontWeight:
                    900,

                  letterSpacing:
                    "2px",

                  color:
                    "#facc15",
                }}
              >
                PAYLAŞILAN KADRO
              </div>

              <div
                style={{
                  display:
                    "flex",

                  marginTop:
                    "18px",

                  maxWidth:
                    "245px",

                  fontSize:
                    share.squad_name.length >
                    20
                      ? 35
                      : 43,

                  lineHeight:
                    1.02,

                  fontWeight:
                    900,

                  color:
                    "#ffffff",
                }}
              >
                {share.squad_name}
              </div>

              <div
                style={{
                  display:
                    "flex",

                  marginTop:
                    "18px",

                  fontSize:
                    18,

                  lineHeight:
                    1.45,

                  color:
                    "#94a3b8",
                }}
              >
                Arkadaşlarınla oluşturduğun kadroyu paylaş ve sahaya kimin çıkacağını göster.
              </div>
            </div>

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
                  height:
                    "1px",

                  width:
                    "100%",

                  background:
                    "rgba(255,255,255,0.09)",
                }}
              />

              <div
                style={{
                  display:
                    "flex",

                  marginTop:
                    "18px",

                  color:
                    "#22c55e",

                  fontSize:
                    17,

                  fontWeight:
                    900,
                }}
              >
                foot-battle.vercel.app
              </div>

              <div
                style={{
                  display:
                    "flex",

                  marginTop:
                    "7px",

                  color:
                    "#64748b",

                  fontSize:
                    14,
                }}
              >
                Kadroyu açmak için bağlantıya dokun
              </div>
            </div>
          </div>

          {/* =================================================
              PITCH CARD
          ================================================= */}

          <div
            style={{
              flex:
                1,

              marginLeft:
                "26px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              border:
                "1px solid rgba(34,197,94,0.20)",

              borderRadius:
                "24px",

              background:
                "#0b1926",

              overflow:
                "hidden",
            }}
          >
            {/* =================================================
                PITCH

                Preview yatay kart içine sığsın diye
                normal sayfadaki dikey sahayı biraz geniş
                gösteriyoruz.
            ================================================= */}

            <div
              style={{
                position:
                  "relative",

                width:
                  "730px",

                height:
                  "470px",

                display:
                  "flex",

                overflow:
                  "hidden",

                borderRadius:
                  "18px",

                border:
                  "5px solid #14532d",

                background:
                  "#35a526",
              }}
            >
              {/* STRIPES */}

              {[0, 2, 4, 6].map(
                (
                  stripe,
                ) => (
                  <div
                    key={
                      stripe
                    }
                    style={{
                      position:
                        "absolute",

                      left:
                        `${stripe * 12.5}%`,

                      top:
                        "0",

                      width:
                        "12.5%",

                      height:
                        "100%",

                      background:
                        "rgba(255,255,255,0.045)",
                    }}
                  />
                ),
              )}

              {/* OUTER BORDER */}

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "18px",

                  right:
                    "18px",

                  top:
                    "18px",

                  bottom:
                    "18px",

                  border:
                    "3px solid rgba(255,255,255,0.85)",
                }}
              />

              {/* MIDDLE LINE */}

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "18px",

                  right:
                    "18px",

                  top:
                    "50%",

                  height:
                    "3px",

                  background:
                    "rgba(255,255,255,0.85)",
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
                    "126px",

                  height:
                    "126px",

                  transform:
                    "translate(-50%, -50%)",

                  borderRadius:
                    "999px",

                  border:
                    "3px solid rgba(255,255,255,0.85)",
                }}
              />

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
                    "#ffffff",
                }}
              />

              {/* TOP PENALTY AREA */}

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "50%",

                  top:
                    "18px",

                  width:
                    "265px",

                  height:
                    "79px",

                  transform:
                    "translateX(-50%)",

                  borderLeft:
                    "3px solid rgba(255,255,255,0.85)",

                  borderRight:
                    "3px solid rgba(255,255,255,0.85)",

                  borderBottom:
                    "3px solid rgba(255,255,255,0.85)",
                }}
              />

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "50%",

                  top:
                    "18px",

                  width:
                    "130px",

                  height:
                    "39px",

                  transform:
                    "translateX(-50%)",

                  borderLeft:
                    "3px solid rgba(255,255,255,0.85)",

                  borderRight:
                    "3px solid rgba(255,255,255,0.85)",

                  borderBottom:
                    "3px solid rgba(255,255,255,0.85)",
                }}
              />

              {/* BOTTOM PENALTY AREA */}

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "50%",

                  bottom:
                    "18px",

                  width:
                    "265px",

                  height:
                    "79px",

                  transform:
                    "translateX(-50%)",

                  borderLeft:
                    "3px solid rgba(255,255,255,0.85)",

                  borderRight:
                    "3px solid rgba(255,255,255,0.85)",

                  borderTop:
                    "3px solid rgba(255,255,255,0.85)",
                }}
              />

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "50%",

                  bottom:
                    "18px",

                  width:
                    "130px",

                  height:
                    "39px",

                  transform:
                    "translateX(-50%)",

                  borderLeft:
                    "3px solid rgba(255,255,255,0.85)",

                  borderRight:
                    "3px solid rgba(255,255,255,0.85)",

                  borderTop:
                    "3px solid rgba(255,255,255,0.85)",
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

                  color:
                    "rgba(255,255,255,0.14)",

                  fontSize:
                    46,

                  fontWeight:
                    900,

                  fontStyle:
                    "italic",
                }}
              >
                FootBattle
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

                  const playerName =
                    cleanPlayerName(
                      player,
                      index,
                    );

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
                      {/* SHIRT */}

                      <div
                        style={{
                          position:
                            "relative",

                          width:
                            "62px",

                          height:
                            "50px",

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
                              "1px",

                            top:
                              "8px",

                            width:
                              "19px",

                            height:
                              "23px",

                            transform:
                              "rotate(-18deg)",

                            borderRadius:
                              "5px",

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
                              "1px",

                            top:
                              "8px",

                            width:
                              "19px",

                            height:
                              "23px",

                            transform:
                              "rotate(18deg)",

                            borderRadius:
                              "5px",

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
                              "38px",

                            height:
                              "44px",

                            transform:
                              "translateX(-50%)",

                            borderRadius:
                              "5px 5px 10px 10px",

                            background:
                              share.body_color,

                            border:
                              "1px solid rgba(0,0,0,0.38)",

                            display:
                              "flex",

                            alignItems:
                              "center",

                            justifyContent:
                              "center",

                            color:
                              "#ffffff",

                            fontSize:
                              19,

                            fontWeight:
                              900,
                          }}
                        >
                          {index + 1}
                        </div>

                        {/* COLLAR */}

                        <div
                          style={{
                            position:
                              "absolute",

                            left:
                              "50%",

                            top:
                              "0",

                            width:
                              "15px",

                            height:
                              "7px",

                            transform:
                              "translate(-50%, -30%)",

                            borderRadius:
                              "0 0 999px 999px",

                            background:
                              "#07111f",
                          }}
                        />
                      </div>

                      {/* NAME */}

                      <div
                        style={{
                          display:
                            "flex",

                          marginTop:
                            "2px",

                          maxWidth:
                            "112px",

                          padding:
                            "4px 8px",

                          borderRadius:
                            "6px",

                          border:
                            "1px solid rgba(255,255,255,0.14)",

                          background:
                            "rgba(7,17,31,0.94)",

                          color:
                            "#ffffff",

                          fontSize:
                            12,

                          fontWeight:
                            900,

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {playerName}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,

      headers: {
        /*
         * Yeni paylaşım kartlarının eski WhatsApp cache'ine
         * takılmasını biraz azaltır.
         */
        "Cache-Control":
          "public, max-age=300, s-maxage=300",
      },
    },
  );
}