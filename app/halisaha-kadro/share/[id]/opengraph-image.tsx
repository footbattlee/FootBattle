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
   * Preview'da aşırı uzun isimler
   * formaların üzerine taşmasın.
   */
  if (name.length > 16) {
    return `${name.slice(0, 14)}…`;
  }

  return name;
}

function getSquadTitleSize(
  title: string,
) {
  if (title.length > 24) {
    return 26;
  }

  if (title.length > 17) {
    return 30;
  }

  return 35;
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

            flexDirection:
              "column",

            alignItems:
              "center",

            justifyContent:
              "center",

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
                18,

              fontSize:
                28,

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

  /*
   * 5–8 kişilik halısahada oyuncuları
   * daha büyük gösteriyoruz.
   *
   * 9–11 kişide çakışmayı azaltmak için
   * bir miktar küçültüyoruz.
   */
  const compact =
    share.player_count >= 9;

  const jerseyWidth =
    compact ? 63 : 76;

  const jerseyHeight =
    compact ? 52 : 62;

  const bodyWidth =
    compact ? 38 : 46;

  const bodyHeight =
    compact ? 45 : 54;

  const sleeveWidth =
    compact ? 19 : 23;

  const sleeveHeight =
    compact ? 23 : 28;

  const numberSize =
    compact ? 18 : 22;

  const playerNameSize =
    compact ? 13 : 16;

  const playerNameMaxWidth =
    compact ? 118 : 142;

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
            TOP BAR
        ================================================= */}

        <div
          style={{
            height:
              "78px",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            padding:
              "0 26px",

            borderBottom:
              "1px solid rgba(255,255,255,0.10)",

            background:
              "#091625",
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
                  "46px",

                height:
                  "46px",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                borderRadius:
                  "12px",

                background:
                  "#22c55e",

                color:
                  "#07111f",

                fontSize:
                  18,

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
                  "13px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  fontSize:
                    25,

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
                    "1px",

                  fontSize:
                    12,

                  fontWeight:
                    800,

                  color:
                    "#22c55e",

                  letterSpacing:
                    "1.3px",
                }}
              >
                HALISAHA KADROM
              </div>
            </div>
          </div>

          {/* COUNT */}

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              padding:
                "9px 16px",

              borderRadius:
                "999px",

              border:
                "1px solid rgba(250,204,21,0.28)",

              background:
                "rgba(250,204,21,0.08)",

              color:
                "#facc15",

              fontSize:
                15,

              fontWeight:
                900,
            }}
          >
            ⚽ {share.player_count} KİŞİ
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
              "18px 24px 24px 24px",
          }}
        >
          {/* =================================================
              SMALL INFO PANEL
          ================================================= */}

          <div
            style={{
              width:
                "215px",

              display:
                "flex",

              flexDirection:
                "column",

              justifyContent:
                "space-between",

              flexShrink:
                0,

              padding:
                "25px 19px",

              border:
                "1px solid rgba(255,255,255,0.10)",

              borderRadius:
                "22px",

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

                  color:
                    "#22c55e",

                  fontSize:
                    12,

                  fontWeight:
                    900,

                  letterSpacing:
                    "1.7px",
                }}
              >
                ⚽ MAÇ KADROSU
              </div>

              <div
                style={{
                  display:
                    "flex",

                  marginTop:
                    "18px",

                  maxWidth:
                    "175px",

                  fontSize:
                    getSquadTitleSize(
                      share.squad_name,
                    ),

                  lineHeight:
                    1.04,

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

                  padding:
                    "8px 11px",

                  width:
                    "fit-content",

                  borderRadius:
                    "9px",

                  background:
                    "rgba(250,204,21,0.10)",

                  border:
                    "1px solid rgba(250,204,21,0.18)",

                  color:
                    "#facc15",

                  fontSize:
                    15,

                  fontWeight:
                    900,
                }}
              >
                {share.player_count} KİŞİLİK KADRO
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
                  width:
                    "100%",

                  height:
                    "1px",

                  background:
                    "rgba(255,255,255,0.09)",
                }}
              />

              <div
                style={{
                  display:
                    "flex",

                  marginTop:
                    "15px",

                  color:
                    "#94a3b8",

                  fontSize:
                    12,

                  lineHeight:
                    1.4,
                }}
              >
                Kadroyu açmak için bağlantıya dokun.
              </div>
            </div>
          </div>

          {/* =================================================
              PITCH WRAPPER
          ================================================= */}

          <div
            style={{
              flex:
                1,

              marginLeft:
                "16px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              overflow:
                "hidden",

              border:
                "1px solid rgba(34,197,94,0.18)",

              borderRadius:
                "22px",

              background:
                "#0b1926",

              padding:
                "10px",
            }}
          >
            {/* =================================================
                BIG PITCH
            ================================================= */}

            <div
              style={{
                position:
                  "relative",

                width:
                  "900px",

                height:
                  "494px",

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

              {/* OUTER LINE */}

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

              {/* CENTER LINE */}

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
                    "128px",

                  height:
                    "128px",

                  transform:
                    "translate(-50%, -50%)",

                  borderRadius:
                    "999px",

                  border:
                    "3px solid rgba(255,255,255,0.85)",
                }}
              />

              {/* CENTER DOT */}

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

              {/* TOP PENALTY */}

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "50%",

                  top:
                    "18px",

                  width:
                    "300px",

                  height:
                    "82px",

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

              {/* TOP SMALL BOX */}

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "50%",

                  top:
                    "18px",

                  width:
                    "145px",

                  height:
                    "41px",

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

              {/* BOTTOM PENALTY */}

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "50%",

                  bottom:
                    "18px",

                  width:
                    "300px",

                  height:
                    "82px",

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

              {/* BOTTOM SMALL BOX */}

              <div
                style={{
                  position:
                    "absolute",

                  left:
                    "50%",

                  bottom:
                    "18px",

                  width:
                    "145px",

                  height:
                    "41px",

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
                    "rgba(255,255,255,0.13)",

                  fontSize:
                    48,

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
                      {/* JERSEY */}

                      <div
                        style={{
                          position:
                            "relative",

                          width:
                            `${jerseyWidth}px`,

                          height:
                            `${jerseyHeight}px`,

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
                              compact
                                ? "8px"
                                : "10px",

                            width:
                              `${sleeveWidth}px`,

                            height:
                              `${sleeveHeight}px`,

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
                              compact
                                ? "8px"
                                : "10px",

                            width:
                              `${sleeveWidth}px`,

                            height:
                              `${sleeveHeight}px`,

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
                              `${bodyWidth}px`,

                            height:
                              `${bodyHeight}px`,

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
                              `${numberSize}px`,

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
                              compact
                                ? "15px"
                                : "18px",

                            height:
                              compact
                                ? "7px"
                                : "8px",

                            transform:
                              "translate(-50%, -30%)",

                            borderRadius:
                              "0 0 999px 999px",

                            background:
                              "#07111f",
                          }}
                        />
                      </div>

                      {/* PLAYER NAME */}

                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          marginTop:
                            compact
                              ? "1px"
                              : "3px",

                          maxWidth:
                            `${playerNameMaxWidth}px`,

                          padding:
                            compact
                              ? "4px 7px"
                              : "5px 10px",

                          borderRadius:
                            "7px",

                          border:
                            "1px solid rgba(255,255,255,0.18)",

                          background:
                            "rgba(7,17,31,0.96)",

                          color:
                            "#ffffff",

                          fontSize:
                            `${playerNameSize}px`,

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
         * WhatsApp / sosyal platform preview cache'i
         * çok uzun süre tutulmasın.
         */
        "Cache-Control":
          "public, max-age=300, s-maxage=300",
      },
    },
  );
}