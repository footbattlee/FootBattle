import type { Metadata } from "next";

import { createGameMetadata } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";
import SurvivorGameClient from "./SurvivorGameClient";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabaseAdmin
    .from("survivor_sets")
    .select("title, description, kind")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  const title = data?.title
    ? `${data.title} Survivor | FootBattle`
    : "Futbol Survivor | FootBattle";
  const description =
    data?.description?.trim() ||
    "16 futbolcu veya takım arasından seçim yap, eleme turnuvasını tamamla ve kendi şampiyonunu belirle.";

  return createGameMetadata({
    path: `/survivor/${slug}`,
    title,
    description,
    keywords: [
      data?.title ? `${data.title} survivor` : "futbol survivor",
      "futbol eleme oyunu",
      "futbol bracket",
      data?.kind === "team" ? "takım turnuvası" : "futbolcu turnuvası",
    ],
  });
}

export default async function SurvivorGamePage({ params }: { params: Params }) {
  const { slug } = await params;
  return <SurvivorGameClient slug={slug} />;
}
