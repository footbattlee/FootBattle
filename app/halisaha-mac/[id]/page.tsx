import type { Metadata } from "next";

import MatchRsvpClient from "@/components/halisaha/MatchRsvpClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Halısaha Maçı | FootBattle",
  description: "Halısaha maçına katılımını bildir, kadro durumunu canlı takip et.",
};

export default async function HalisahaMatchPage(props: PageProps) {
  const { id } = await props.params;
  return <MatchRsvpClient id={id} />;
}
