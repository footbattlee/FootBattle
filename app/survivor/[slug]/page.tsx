import type { Metadata } from "next";

import { createGameMetadata } from "@/lib/seo";
import { SurvivorSeoContent } from "@/lib/survivor-seo";
import { supabaseAdmin } from "@/lib/supabase/server";
import SurvivorGameClient from "./SurvivorGameClient";

type Params = Promise<{ slug: string }>;

type SurvivorSet = {
  id: string;
  title: string;
  description: string;
  kind: "player" | "team";
};

type SurvivorEntry = {
  name: string;
  slot: number;
};

async function getSurvivorSeoData(slug: string) {
  const { data: set } = await supabaseAdmin
    .from("survivor_sets")
    .select("id, title, description, kind")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<SurvivorSet>();

  if (!set) return null;

  const { data: entries } = await supabaseAdmin
    .from("survivor_entries")
    .select("name, slot")
    .eq("set_id", set.id)
    .order("slot", { ascending: true });

  return {
    set,
    entries: (entries ?? []) as SurvivorEntry[],
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const seoData = await getSurvivorSeoData(slug);

  if (!seoData) {
    return {
      title: "Survivor Bulunamadı | FootBattle",
      robots: { index: false, follow: false },
    };
  }

  const { set, entries } = seoData;
  const participantLabel = set.kind === "team" ? "takım" : "futbolcu";
  const description =
    set.description?.trim() ||
    `${set.title}: 16 ${participantLabel} arasından seçim yap, sabit eleme ağacında finale ilerle ve kendi şampiyonunu belirle.`;

  const metadata = createGameMetadata({
    path: `/survivor/${slug}`,
    title: `${set.title} Survivor | FootBattle`,
    description,
    keywords: [
      `${set.title} survivor`,
      `${set.title} eleme oyunu`,
      `${set.title} turnuva`,
      "futbol survivor",
      "futbol eleme oyunu",
      "futbol bracket",
      set.kind === "team" ? "takım turnuvası" : "futbolcu turnuvası",
      ...entries.slice(0, 6).map((entry) => `${entry.name} survivor`),
    ],
  });

  return {
    ...metadata,
    robots: { index: true, follow: true },
  };
}

export default async function SurvivorGamePage({ params }: { params: Params }) {
  const { slug } = await params;
  const seoData = await getSurvivorSeoData(slug);

  return (
    <>
      <SurvivorGameClient slug={slug} />
      {seoData && (
        <SurvivorSeoContent
          slug={slug}
          title={seoData.set.title}
          description={seoData.set.description}
          kind={seoData.set.kind}
          entries={seoData.entries}
        />
      )}
    </>
  );
}
