import TeamBalancerClient from "@/components/halisaha/TeamBalancerClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HalisahaBalancedTeamsPage(props: PageProps) {
  const { id } = await props.params;
  return <TeamBalancerClient id={id} />;
}
