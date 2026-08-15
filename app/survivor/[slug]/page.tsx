import SurvivorGameClient from "./SurvivorGameClient";

export default async function SurvivorGamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SurvivorGameClient slug={slug} />;
}
