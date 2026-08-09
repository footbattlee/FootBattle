import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type DuelStatus =
  | "pending"
  | "accepted"
  | "active"
  | "completed"
  | "rejected"
  | "cancelled";

type DuelRow = {
  id: number;

  challenger_id: string;
  opponent_id: string;

  game_code: string;
  status: DuelStatus;

  challenger_score: number;
  opponent_score: number;

  winner_id: string | null;

  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

type ProfileRow = {
  id: string;

  username: string | null;
  display_name: string | null;
  avatar_url: string | null;

  total_score: number | null;
  current_streak: number | null;
  games_played: number | null;
  games_won: number | null;

  last_seen_at: string | null;
};

/* =========================================================
   CONSTANTS
========================================================= */

const ONLINE_THRESHOLD_MS =
  2 * 60 * 1000;

const GAME_LABELS: Record<string, string> = {
  club_clash: "2 Takım 1 Oyuncu",
  tic_tac_toe: "Football Tic Tac Toe",
  country_club: "Ülke + Takım",

  // Eski test düellosu hâlâ DB'de olduğu için
  // şimdilik bunu da bırakıyoruz.
  player_duel: "Test Düellosu",
};

/* =========================================================
   HELPERS
========================================================= */

function getPresence(
  lastSeenAt: string | null,
) {
  if (!lastSeenAt) {
    return {
      online: false,
      lastSeenAt: null,
      lastSeenText:
        "Henüz görülmedi",
    };
  }

  const lastSeenTime =
    new Date(
      lastSeenAt,
    ).getTime();

  const difference =
    Date.now() -
    lastSeenTime;

  const online =
    difference >= 0 &&
    difference <=
      ONLINE_THRESHOLD_MS;

  if (online) {
    return {
      online: true,
      lastSeenAt,
      lastSeenText:
        "Çevrimiçi",
    };
  }

  const minutes =
    Math.floor(
      difference / 60_000,
    );

  if (minutes < 1) {
    return {
      online: false,
      lastSeenAt,
      lastSeenText:
        "Az önce aktifti",
    };
  }

  if (minutes < 60) {
    return {
      online: false,
      lastSeenAt,
      lastSeenText:
        `${minutes} dk önce aktifti`,
    };
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return {
      online: false,
      lastSeenAt,
      lastSeenText:
        `${hours} sa önce aktifti`,
    };
  }

  const days =
    Math.floor(
      hours / 24,
    );

  return {
    online: false,
    lastSeenAt,
    lastSeenText:
      `${days} gün önce aktifti`,
  };
}

function getGameLabel(
  gameCode: string,
) {
  return (
    GAME_LABELS[gameCode] ??
    gameCode
  );
}

/* =========================================================
   GET /api/duels
========================================================= */

export async function GET() {
  try {
    /* -----------------------------------------------------
       1. AUTH
    ----------------------------------------------------- */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: { user },
      error: userError,
    } =
      await authSupabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Giriş yapmalısın.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * TypeScript'in inner function
     * içinde user null olabilir diye
     * düşünmemesi için ID'yi burada
     * sabitliyoruz.
     */
    const currentUserId =
      user.id;

    /* -----------------------------------------------------
       2. KULLANICININ TÜM DÜELLOLARI
    ----------------------------------------------------- */

    const {
      data: duelRows,
      error: duelError,
    } = await supabaseAdmin
      .from("duels")
      .select(`
        id,
        challenger_id,
        opponent_id,
        game_code,
        status,
        challenger_score,
        opponent_score,
        winner_id,
        created_at,
        accepted_at,
        started_at,
        completed_at,
        updated_at
      `)
      .or(
        `challenger_id.eq.${currentUserId},opponent_id.eq.${currentUserId}`,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (duelError) {
      console.error(
        "Düello listesi okunamadı:",
        duelError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düellolar okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const duels =
      (duelRows ??
        []) as DuelRow[];

    /* -----------------------------------------------------
       3. İLGİLİ PROFİL ID'LERİ
    ----------------------------------------------------- */

    const profileIds =
      Array.from(
        new Set(
          duels.flatMap(
            (duel) => [
              duel.challenger_id,
              duel.opponent_id,
            ],
          ),
        ),
      );

    /* -----------------------------------------------------
       4. PROFİLLERİ ÇEK
    ----------------------------------------------------- */

    let profiles: ProfileRow[] =
      [];

    if (
      profileIds.length > 0
    ) {
      const {
        data: profileRows,
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          total_score,
          current_streak,
          games_played,
          games_won,
          last_seen_at
        `)
        .in(
          "id",
          profileIds,
        );

      if (profileError) {
        console.error(
          "Düello profilleri okunamadı:",
          profileError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "Oyuncu profilleri okunamadı.",
          },
          {
            status: 500,
          },
        );
      }

      profiles =
        (profileRows ??
          []) as ProfileRow[];
    }

    /* -----------------------------------------------------
       5. PROFİL FORMATTER
    ----------------------------------------------------- */

    function getProfile(
      profileId: string,
    ) {
      const profile =
        profiles.find(
          (item) =>
            item.id ===
            profileId,
        );

      if (!profile) {
        return null;
      }

      const presence =
        getPresence(
          profile.last_seen_at,
        );

      return {
        id:
          profile.id,

        username:
          profile.username,

        displayName:
          profile.display_name ??
          profile.username ??
          "FootBattle Oyuncusu",

        avatarUrl:
          profile.avatar_url ??
          null,

        totalScore:
          Number(
            profile.total_score ??
              0,
          ),

        currentStreak:
          Number(
            profile.current_streak ??
              0,
          ),

        gamesPlayed:
          Number(
            profile.games_played ??
              0,
          ),

        gamesWon:
          Number(
            profile.games_won ??
              0,
          ),

        online:
          presence.online,

        lastSeenAt:
          presence.lastSeenAt,

        lastSeenText:
          presence.lastSeenText,
      };
    }

    /* -----------------------------------------------------
       6. DÜELLO FORMATTER
    ----------------------------------------------------- */

    function formatDuel(
      duel: DuelRow,
    ) {
      const challenger =
        getProfile(
          duel.challenger_id,
        );

      const opponent =
        getProfile(
          duel.opponent_id,
        );

      const viewerRole:
        | "challenger"
        | "opponent" =
        duel.challenger_id ===
        currentUserId
          ? "challenger"
          : "opponent";

      const otherPlayer =
        viewerRole ===
        "challenger"
          ? opponent
          : challenger;

      const myScore =
        viewerRole ===
        "challenger"
          ? duel.challenger_score
          : duel.opponent_score;

      const opponentScore =
        viewerRole ===
        "challenger"
          ? duel.opponent_score
          : duel.challenger_score;

      let result:
        | "won"
        | "lost"
        | "draw"
        | null = null;

      if (
        duel.status ===
        "completed"
      ) {
        if (
          duel.winner_id ===
          currentUserId
        ) {
          result =
            "won";
        } else if (
          duel.winner_id !==
          null
        ) {
          result =
            "lost";
        } else {
          result =
            "draw";
        }
      }

      return {
        id:
          duel.id,

        gameCode:
          duel.game_code,

        gameLabel:
          getGameLabel(
            duel.game_code,
          ),

        status:
          duel.status,

        viewerRole,

        challenger,

        opponent,

        otherPlayer,

        myScore,

        opponentScore,

        result,

        winnerId:
          duel.winner_id,

        createdAt:
          duel.created_at,

        acceptedAt:
          duel.accepted_at,

        startedAt:
          duel.started_at,

        completedAt:
          duel.completed_at,

        updatedAt:
          duel.updated_at,
      };
    }

    /* -----------------------------------------------------
       7. GELEN DAVETLER
    ----------------------------------------------------- */

    const incoming =
      duels
        .filter(
          (duel) =>
            duel.status ===
              "pending" &&
            duel.opponent_id ===
              currentUserId,
        )
        .map(
          formatDuel,
        );

    /* -----------------------------------------------------
       8. GÖNDERİLEN DAVETLER
    ----------------------------------------------------- */

    const outgoing =
      duels
        .filter(
          (duel) =>
            duel.status ===
              "pending" &&
            duel.challenger_id ===
              currentUserId,
        )
        .map(
          formatDuel,
        );

    /* -----------------------------------------------------
       9. AKTİF DÜELLOLAR
    ----------------------------------------------------- */

    const active =
      duels
        .filter(
          (duel) =>
            duel.status ===
              "accepted" ||
            duel.status ===
              "active",
        )
        .map(
          formatDuel,
        );

    /* -----------------------------------------------------
       10. GEÇMİŞ
    ----------------------------------------------------- */

    const history =
      duels
        .filter(
          (duel) =>
            duel.status ===
              "completed" ||
            duel.status ===
              "rejected" ||
            duel.status ===
              "cancelled",
        )
        .map(
          formatDuel,
        )
        .slice(
          0,
          20,
        );

    /* -----------------------------------------------------
       11. İSTATİSTİKLER
    ----------------------------------------------------- */

    const completedDuels =
      duels.filter(
        (duel) =>
          duel.status ===
          "completed",
      );

    const wins =
      completedDuels.filter(
        (duel) =>
          duel.winner_id ===
          currentUserId,
      ).length;

    const losses =
      completedDuels.filter(
        (duel) =>
          duel.winner_id !==
            null &&
          duel.winner_id !==
            currentUserId,
      ).length;

    const draws =
      completedDuels.filter(
        (duel) =>
          duel.winner_id ===
          null,
      ).length;

    /* -----------------------------------------------------
       12. RESPONSE
    ----------------------------------------------------- */

    return NextResponse.json({
      ok: true,

      summary: {
        incomingCount:
          incoming.length,

        outgoingCount:
          outgoing.length,

        activeCount:
          active.length,

        historyCount:
          history.length,

        completedCount:
          completedDuels.length,

        wins,

        losses,

        draws,
      },

      incoming,

      outgoing,

      active,

      history,
    });
  } catch (error) {
    console.error(
      "Duels GET endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Düellolar okunamadı.",
      },
      {
        status: 500,
      },
    );
  }
}