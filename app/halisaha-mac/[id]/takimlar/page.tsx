import TeamBalancerClient from "@/components/halisaha/TeamBalancerClient";
import { extractPublicMatchId } from "@/lib/halisaha/match";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HalisahaBalancedTeamsPage(props: PageProps) {
  const { id: routeValue } = await props.params;
  return (
    <TeamBalancerClient
      id={extractPublicMatchId(routeValue)}
      publicSlug={routeValue}
    />
  );
}
