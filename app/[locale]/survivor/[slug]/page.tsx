import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocalizedSurvivorGameClient from "./LocalizedSurvivorGameClient";
import { SITE_URL } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = Promise<{ locale: string; slug: string }>;

type SurvivorSet = {
  id: string;
  title: string;
  description: string;
  kind: "player" | "team";
};

async function getSet(slug: string) {
  const { data } = await supabaseAdmin
    .from("survivor_sets")
    .select("id, title, description, kind")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<SurvivorSet>();
  return data ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const normalized = locale === "en" ? "en" : locale === "tr" ? "tr" : null;
  if (!normalized) return {};
  const set = await getSet(slug);
  if (!set) return { title: normalized === "en" ? "Survivor Not Found | FootBattle" : "Survivor Bulunamadı | FootBattle", robots: { index: false, follow: false } };

  const en = normalized === "en";
  const description = set.description?.trim() || (en
    ? `${set.title}: choose between 16 ${set.kind === "team" ? "teams" : "players"}, advance your winners through a fixed knockout bracket and crown your champion.`
    : `${set.title}: 16 ${set.kind === "team" ? "takım" : "futbolcu"} arasından seçim yap, sabit eleme ağacında finale ilerle ve kendi şampiyonunu belirle.`);

  return {
    title: `${set.title} Survivor | FootBattle`,
    description,
    alternates: {
      canonical: `${SITE_URL}/${normalized}/survivor/${slug}`,
      languages: {
        tr: `${SITE_URL}/tr/survivor/${slug}`,
        en: `${SITE_URL}/en/survivor/${slug}`,
        "x-default": `${SITE_URL}/tr/survivor/${slug}`,
      },
    },
    openGraph: {
      title: `${set.title} Survivor | FootBattle`,
      description,
      url: `${SITE_URL}/${normalized}/survivor/${slug}`,
      locale: en ? "en_US" : "tr_TR",
      alternateLocale: [en ? "tr_TR" : "en_US"],
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocalizedSurvivorPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (locale !== "tr" && locale !== "en") notFound();
  const set = await getSet(slug);
  if (!set) notFound();
  return <LocalizedSurvivorGameClient slug={slug} locale={locale} />;
}
