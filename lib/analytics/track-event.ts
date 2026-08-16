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

type CampaignAttribution = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
};

function readCampaignAttribution(): CampaignAttribution | null {
  if (typeof window === "undefined") return null;

  try {
    const search = new URLSearchParams(window.location.search);
    const source = search.get("utm_source");
    const medium = search.get("utm_medium");
    const campaign = search.get("utm_campaign");
    const content = search.get("utm_content");

    if (source || medium || campaign || content) {
      const attribution = { source, medium, campaign, content };
      window.localStorage.setItem("footbattle_campaign_attribution", JSON.stringify(attribution));
      return attribution;
    }

    const stored = window.localStorage.getItem("footbattle_campaign_attribution");
    return stored ? (JSON.parse(stored) as CampaignAttribution) : null;
  } catch {
    return null;
  }
}

export async function trackEvent({
  eventName,
  gameName,
  sessionId = null,
  pagePath = null,
  metadata = {},
}: TrackEventParams) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const attribution = readCampaignAttribution();

    const { error } = await supabase
      .from("analytics_events")
      .insert({
        event_name: eventName,
        game_name: gameName,
        user_id: user?.id ?? null,
        session_id: sessionId,
        page_path: pagePath ?? (typeof window !== "undefined" ? window.location.pathname : null),
        metadata: {
          ...metadata,
          ...(attribution ? { attribution } : {}),
        },
      });

    if (error) {
      console.error("Analytics event insert error:", error);
    }
  } catch (error) {
    console.error("Analytics trackEvent error:", error);
  }
}
