import { createClient } from "@/lib/supabase/client";

type AnalyticsEventName =
  | "game_started"
  | "game_completed"
  | "play_again"
  | "game_shared"
  | "halisaha_created"
  | "halisaha_shared"
  | "halisaha_share_opened"
  | "signup_completed";

type TrackEventParams = {
  eventName: AnalyticsEventName;
  gameName?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

const SESSION_ID_KEY = "footbattle_analytics_session_id";

function getSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  let sessionId = window.localStorage.getItem(
    SESSION_ID_KEY,
  );

  if (!sessionId) {
    sessionId = crypto.randomUUID();

    window.localStorage.setItem(
      SESSION_ID_KEY,
      sessionId,
    );
  }

  return sessionId;
}

export async function trackEvent({
  eventName,
  gameName,
  userId = null,
  metadata = {},
}: TrackEventParams) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("analytics_events")
      .insert({
        event_name: eventName,
        game_name: gameName ?? null,
        user_id: userId,
        session_id: getSessionId(),
        page_path: window.location.pathname,
        metadata,
      });

    if (error) {
      console.error(
        "Analytics event yazılamadı:",
        error,
      );
    }
  } catch (error) {
    console.error(
      "Analytics event hatası:",
      error,
    );
  }
}