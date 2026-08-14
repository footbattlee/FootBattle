import type { Metadata } from "next";

import MatchRsvpClient from "@/components/halisaha/MatchRsvpClient";
import {
  createPublicMatchPath,
  extractPublicMatchId,
  type MatchRow,
} from "@/lib/halisaha/match";
import { supabaseAdmin } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getMatch(routeValue: string) {
  const id = extractPublicMatchId(routeValue);
  const { data } = await supabaseAdmin
    .from("halisaha_matches")
    .select("id,title,match_date,match_time,location,target_players,note,created_at")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as MatchRow | null;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { id: routeValue } = await props.params;
  const match = await getMatch(routeValue);

  if (!match) {
    return {
      title: "Halısaha Maçı | FootBattle",
      description: "Halısaha maçına katılımını bildir ve kadro durumunu takip et.",
    };
  }

  const date = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${match.match_date}T12:00:00`));
  const time = match.match_time.slice(0, 5);
  const location = match.location || "Halısaha";
  const canonical = createPublicMatchPath({
    id: match.id,
    matchDate: match.match_date,
    matchTime: match.match_time,
    location,
  });
  const title = `${date} · ${location} · ${time} | FootBattle`;
  const description = `${match.title}: ${date}, ${time}, ${location}. Katılıyor musun? Durumunu tek dokunuşla bildir.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "tr_TR",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HalisahaMatchPage(props: PageProps) {
  const { id: routeValue } = await props.params;
  const id = extractPublicMatchId(routeValue);
  return <MatchRsvpClient id={id} publicSlug={routeValue} />;
}
