import { createClient } from "@/lib/supabase/client";

export type AnalyticsEventName =
  | "game_started"
  | "game_completed"
  | "game_surrendered"
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
  term?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
  capturedAt?: string | null;
};

type AttributionEnvelope = {
  firstTouch: CampaignAttribution | null;
  lastTouch: CampaignAttribution | null;
};

const LEGACY_KEY = "footbattle_campaign_attribution";
const FIRST_TOUCH_KEY = "footbattle_campaign_first_touch";
const LAST_TOUCH_KEY = "footbattle_campaign_last_touch";

function parseStored(value: string | null): CampaignAttribution | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as CampaignAttribution;
  } catch {
    return null;
  }
}

function normalizeTouch(input: CampaignAttribution): CampaignAttribution {
  const next = { ...input };
  if (next.source === "share") {
    next.content = next.content || (next.medium && next.medium !== "organic" ? next.medium : null);
    next.medium = "organic";
    next.campaign = next.campaign || "game_share";
  }
  if (next.source === "reddit" && next.campaign === "reddit_launch") {
    next.campaign = "global_launch";
  }
  return next;
}

function readCampaignAttribution(): AttributionEnvelope | null {
  if (typeof window === "undefined") return null;

  try {
    const search = new URLSearchParams(window.location.search);
    const source = search.get("utm_source");
    const medium = search.get("utm_medium");
    const campaign = search.get("utm_campaign");
    const content = search.get("utm_content");
    const term = search.get("utm_term");
    const hasCampaign = Boolean(source || medium || campaign || content || term);

    let firstTouch = parseStored(window.localStorage.getItem(FIRST_TOUCH_KEY));
    let lastTouch = parseStored(window.localStorage.getItem(LAST_TOUCH_KEY));

    const legacy = parseStored(window.localStorage.getItem(LEGACY_KEY));
    if (!firstTouch && legacy) {
      firstTouch = normalizeTouch(legacy);
      window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(firstTouch));
    }
    if (!lastTouch && legacy) lastTouch = normalizeTouch(legacy);

    if (hasCampaign) {
      const current = normalizeTouch({
        source,
        medium,
        campaign,
        content,
        term,
        landingPath: window.location.pathname,
        referrer: document.referrer || null,
        capturedAt: new Date().toISOString(),
      });

      if (!firstTouch) {
        firstTouch = current;
        window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(current));
      }

      lastTouch = current;
      window.localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(current));
      window.localStorage.setItem(LEGACY_KEY, JSON.stringify(current));
    }

    if (!firstTouch && !lastTouch) return null;
    return { firstTouch, lastTouch };
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
