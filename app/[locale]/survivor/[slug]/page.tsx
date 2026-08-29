import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocalizedSurvivorGameClient from "./LocalizedSurvivorGameClient";
import { NO_INDEX_METADATA, SITE_URL } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = Promise<{ locale: string; slug: string }>;
type Locale = "tr" | "en";

type SurvivorSet = {
  id: string;
  title: string;
  description: string;
  title_tr: string | null;
  title_en: string | null;
  description_tr: string | null;
  description_en: string | null;
  kind: "player" | "team";
};

async function getSet(slug: string) {
  const { data } = await supabaseAdmin
    .from("survivor_sets")
    .select("id, title, description, title_tr, title_en, description_tr, description_en, kind")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<SurvivorSet>();
  return data ?? null;
}

function localizeSet(set: SurvivorSet, locale: Locale) {
  const titleTr = set.title_tr?.trim() || set.title;
  const descriptionTr = set.description_tr?.trim() || set.description || "";
  return {
    ...set,
    title: locale === "en" ? (set.title_en?.trim() || titleTr) : titleTr,
    description: locale === "en" ? (set.description_en?.trim() || descriptionTr) : descriptionTr,
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const normalized: Locale | null = locale === "en" ? "en" : locale === "tr" ? "tr" : null;
  if (!normalized) return {};
  const rawSet = await getSet(slug);
  if (!rawSet) return { title: normalized === "en" ? "Survivor Not Found | FootBattle" : "Survivor Bulunamadı | FootBattle", ...NO_INDEX_METADATA };

  const set = localizeSet(rawSet, normalized);
  const en = normalized === "en";
  const description = set.description?.trim() || (en
    ? `${set.title}: choose between 16 ${set.kind === "team" ? "teams" : "players"}, advance your winners through a fixed knockout bracket and crown your champion.`
    : `${set.title}: 16 ${set.kind === "team" ? "takım" : "futbolcu"} arasından seçim yap, sabit eleme ağacında finale ilerle ve kendi şampiyonunu belirle.`);

  return {
    ...NO_INDEX_METADATA,
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
  };
}

export default async function LocalizedSurvivorPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (locale !== "tr" && locale !== "en") notFound();
  const set = await getSet(slug);
  if (!set) notFound();
  return <LocalizedSurvivorGameClient slug={slug} locale={locale} />;
}
