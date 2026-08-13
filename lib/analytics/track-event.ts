import { createClient } from "@/lib/supabase/client";

export type AnalyticsEventName =
  | "game_started"
  | "game_completed"
  | "play_again"
  | "shared";

type TrackEventParams = {
  eventName: AnalyticsEventName;

  gameName: string;

  sessionId?: string | null;

  pagePath?: string | null;

  metadata?: Record<string, unknown>;
};

export async function trackEvent({
  eventName,
  gameName,
  sessionId = null,
  pagePath = null,
  metadata = {},
}: TrackEventParams) {
  try {
    const supabase =
      createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    const {
      error,
    } =
      await supabase
        .from("analytics_events")
        .insert({
          event_name:
            eventName,

          game_name:
            gameName,

          user_id:
            user?.id ?? null,

          session_id:
            sessionId,

          page_path:
            pagePath ??
            (
              typeof window !==
              "undefined"
                ? window.location.pathname
                : null
            ),

          metadata,
        });

    if (error) {
      console.error(
        "Analytics event insert error:",
        error,
      );
    }
  } catch (error) {
    console.error(
      "Analytics trackEvent error:",
      error,
    );
  }
}