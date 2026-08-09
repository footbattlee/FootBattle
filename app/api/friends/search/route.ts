import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type FriendshipRow = {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
};

export async function GET(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Giriş yapan kullanıcıyı bul
    // --------------------------------------------------

    const authSupabase =
      await createAuthServerClient();

    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Giriş yapmalısın.",
        },
        {
          status: 401,
        },
      );
    }

    // --------------------------------------------------
    // 2. Arama kelimesini al
    // --------------------------------------------------

    const requestUrl =
      new URL(request.url);

    const query = (
      requestUrl.searchParams.get("q") ?? ""
    )
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    if (query.length < 2) {
      return NextResponse.json({
        ok: true,
        users: [],
      });
    }

    // --------------------------------------------------
    // 3. Username üzerinden kullanıcı ara
    // --------------------------------------------------

    const {
      data: profiles,
      error: profilesError,
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
        games_won
      `)
      .neq("id", user.id)
      .not("username", "is", null)
      .ilike("username", `%${query}%`)
      .order("total_score", {
        ascending: false,
      })
      .limit(10);

    if (profilesError) {
      console.error(
        "Profil arama hatası:",
        profilesError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kullanıcılar aranamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !profiles ||
      profiles.length === 0
    ) {
      return NextResponse.json({
        ok: true,
        users: [],
      });
    }

    // --------------------------------------------------
    // 4. Bu kişilerle mevcut arkadaşlık var mı?
    // --------------------------------------------------

    const profileIds =
      profiles.map(
        (profile) =>
          String(profile.id),
      );

    const {
      data: friendshipRows,
      error: friendshipsError,
    } = await supabaseAdmin
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        status
      `)
      .or(
        `requester_id.eq.${user.id},addressee_id.eq.${user.id}`,
      )
      .in("requester_id", [
        user.id,
        ...profileIds,
      ])
      .in("addressee_id", [
        user.id,
        ...profileIds,
      ]);

    if (friendshipsError) {
      console.error(
        "Arkadaşlık sorgu hatası:",
        friendshipsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Arkadaşlık durumları okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const friendships =
      (friendshipRows ??
        []) as FriendshipRow[];

    // --------------------------------------------------
    // 5. Sonucu UI için hazırla
    // --------------------------------------------------

    const users = profiles.map(
      (profile) => {
        const profileId =
          String(profile.id);

        const friendship =
          friendships.find(
            (item) =>
              (item.requester_id ===
                user.id &&
                item.addressee_id ===
                  profileId) ||
              (item.addressee_id ===
                user.id &&
                item.requester_id ===
                  profileId),
          );

        let friendshipStatus:
          | "none"
          | "pending_sent"
          | "pending_received"
          | "accepted"
          | "rejected" = "none";

        if (friendship) {
          if (
            friendship.status ===
            "accepted"
          ) {
            friendshipStatus =
              "accepted";
          } else if (
            friendship.status ===
            "rejected"
          ) {
            friendshipStatus =
              "rejected";
          } else if (
            friendship.status ===
              "pending" &&
            friendship.requester_id ===
              user.id
          ) {
            friendshipStatus =
              "pending_sent";
          } else if (
            friendship.status ===
              "pending" &&
            friendship.addressee_id ===
              user.id
          ) {
            friendshipStatus =
              "pending_received";
          }
        }

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

          totalScore: Number(
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

          friendship: friendship
            ? {
                id:
                  friendship.id,
                status:
                  friendshipStatus,
              }
            : {
                id: null,
                status:
                  "none",
              },
        };
      },
    );

    return NextResponse.json({
      ok: true,
      users,
    });
  } catch (error) {
    console.error(
      "Friends search endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Kullanıcılar aranamadı.",
      },
      {
        status: 500,
      },
    );
  }
}