export type CampaignSource = "reddit" | "instagram" | "youtube" | "share";

export type CampaignParams = {
  source: CampaignSource | string;
  medium: string;
  campaign: string;
  content?: string | null;
  term?: string | null;
};

export const CAMPAIGNS = {
  redditLaunch: { source: "reddit", medium: "social", campaign: "global_launch" },
  instagramOrganic: { source: "instagram", medium: "social", campaign: "organic_social" },
  youtubeOrganic: { source: "youtube", medium: "video", campaign: "organic_social" },
  gameShare: { source: "share", medium: "organic", campaign: "game_share" },
} as const;

export function campaignSearchParams(params: CampaignParams) {
  const search = new URLSearchParams();
  search.set("utm_source", params.source);
  search.set("utm_medium", params.medium);
  search.set("utm_campaign", params.campaign);
  if (params.content) search.set("utm_content", params.content);
  if (params.term) search.set("utm_term", params.term);
  return search;
}

export function buildCampaignPath(path: string, params: CampaignParams) {
  const search = campaignSearchParams(params).toString();
  return `${path}${path.includes("?") ? "&" : "?"}${search}`;
}
