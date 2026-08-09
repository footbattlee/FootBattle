import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type FriendshipRow = {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
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

/*
 * Son 2 dakika içinde heartbeat geldiyse online.
 */
const ONLINE_THRESHOLD_MS =
  2 * 60 * 1000;

function getPresence(
  lastSeenAt: string | null,
) {
  if (!lastSeenAt) {
    return {
      online: false,
      lastSeenAt: null,
      lastSeenText: "Henüz görülmedi",
    };
  }

  const lastSeenTime =
    new Date(lastSeenAt).getTime();

  const now =
    Date.now();

  const difference =
    now - lastSeenTime;

  const online =
    difference >= 0 &&
    difference <=
      ONLINE_THRESHOLD_MS;

  if (online) {
    return {
      online: true,
      lastSeenAt,
      lastSeenText: "Çevrimiçi",
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

export async function GET() {
  try {
    /*
     * --------------------------------------------------
     * 1. Giriş yapan kullanıcı
     * --------------------------------------------------
     */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: { user },
      error: userError,
    } =
      await authSupabase.auth.getUser();

    if (userError || !user) {
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
     * --------------------------------------------------
     * 2. Kullanıcının tüm friendship kayıtları
     * --------------------------------------------------
     */

    const {
      data: friendshipRows,
      error: friendshipError,
    } = await supabaseAdmin
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        updated_at
      `)
      .or(
        `requester_id.eq.${user.id},addressee_id.eq.${user.id}`,
      )
      .order("created_at", {
        ascending: false,
      });

    if (friendshipError) {
      console.error(
        "Friendships okunamadı:",
        friendshipError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Arkadaşlık bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const friendships =
      (friendshipRows ??
        []) as FriendshipRow[];

    /*
     * --------------------------------------------------
     * 3. İlişkili kullanıcı ID'lerini çıkar
     * --------------------------------------------------
     */

    const relatedUserIds =
      Array.from(
        new Set(
          friendships.map(
            (friendship) =>
              friendship.requester_id ===
              user.id
                ? friendship.addressee_id
                : friendship.requester_id,
          ),
        ),
      );

    /*
     * --------------------------------------------------
     * 4. Profilleri çek
     * --------------------------------------------------
     */

    let profiles: ProfileRow[] =
      [];

    if (
      relatedUserIds.length > 0
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
          relatedUserIds,
        );

      if (profileError) {
        console.error(
          "Arkadaş profilleri okunamadı:",
          profileError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "Arkadaş profilleri okunamadı.",
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

    /*
     * --------------------------------------------------
     * 5. Profil formatter
     * --------------------------------------------------
     */

    function getUserProfile(
      userId: string,
    ) {
      const profile =
        profiles.find(
          (item) =>
            item.id === userId,
        );

      if (!profile) {
        return null;
      }

      const presence =
        getPresence(
          profile.last_seen_at,
        );

      return {
        id: profile.id,

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

    /*
     * --------------------------------------------------
     * 6. Gelen arkadaşlık istekleri
     * --------------------------------------------------
     */

    const incomingRequests =
      friendships
        .filter(
          (friendship) =>
            friendship.status ===
              "pending" &&
            friendship.addressee_id ===
              user.id,
        )
        .map(
          (friendship) => {
            const requestUser =
              getUserProfile(
                friendship.requester_id,
              );

            if (!requestUser) {
              return null;
            }

            return {
              friendshipId:
                friendship.id,

              createdAt:
                friendship.created_at,

              user:
                requestUser,
            };
          },
        )
        .filter(
          (
            item,
          ): item is NonNullable<
            typeof item
          > => item !== null,
        );

    /*
     * --------------------------------------------------
     * 7. Accepted arkadaşlar
     * --------------------------------------------------
     */

    const friends =
      friendships
        .filter(
          (friendship) =>
            friendship.status ===
            "accepted",
        )
        .map(
          (friendship) => {
            const otherUserId =
              friendship.requester_id ===
              user.id
                ? friendship.addressee_id
                : friendship.requester_id;

            const friendUser =
              getUserProfile(
                otherUserId,
              );

            if (!friendUser) {
              return null;
            }

            return {
              friendshipId:
                friendship.id,

              since:
                friendship.updated_at,

              user:
                friendUser,
            };
          },
        )
        .filter(
          (
            item,
          ): item is NonNullable<
            typeof item
          > => item !== null,
        )
        /*
         * Online arkadaşları yukarı al.
         * Aynı durumda toplam puanı yüksek olan önce gelsin.
         */
        .sort((a, b) => {
          if (
            a.user.online !==
            b.user.online
          ) {
            return a.user.online
              ? -1
              : 1;
          }

          return (
            b.user.totalScore -
            a.user.totalScore
          );
        });

    /*
     * --------------------------------------------------
     * 8. Özet
     * --------------------------------------------------
     */

    const onlineFriendsCount =
      friends.filter(
        (friend) =>
          friend.user.online,
      ).length;

    return NextResponse.json({
      ok: true,

      summary: {
        friendCount:
          friends.length,

        onlineFriendCount:
          onlineFriendsCount,

        incomingRequestCount:
          incomingRequests.length,
      },

      incomingRequests,

      friends,
    });
  } catch (error) {
    console.error(
      "Friends GET endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Arkadaş bilgileri okunamadı.",
      },
      {
        status: 500,
      },
    );
  }
}