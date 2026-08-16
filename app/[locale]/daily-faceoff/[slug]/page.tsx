import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { faceoffSlug } from "@/lib/faceoff-seo";
import { SITE_URL } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = Promise<{ locale: string; slug: string }>;
type Locale = "tr" | "en";
type FaceoffRow = {
  id: string;
  match_date: string;
  title: string;
  category: string;
  title_tr: string | null;
  title_en: string | null;
  category_tr: string | null;
  category_en: string | null;
  left_name: string;
  right_name: string;
  is_active: boolean;
};

type LocalizedFaceoff = FaceoffRow & { displayTitle: string; displayCategory: string };

async function getFaceoff(slug: string, locale: Locale): Promise<LocalizedFaceoff | null> {
  const { data } = await supabaseAdmin
    .from("daily_faceoffs")
    .select("id, match_date, title, category, title_tr, title_en, category_tr, category_en, left_name, right_name, is_active")
    .eq("is_active", true)
    .order("match_date", { ascending: false });
  const row = (data ?? []).find((item) => faceoffSlug(item) === slug) as FaceoffRow | undefined;
  if (!row) return null;
  const titleTr = row.title_tr?.trim() || row.title;
  const categoryTr = row.category_tr?.trim() || row.category;
  return {
    ...row,
    displayTitle: locale === "en" ? (row.title_en?.trim() || titleTr) : titleTr,
    displayCategory: locale === "en" ? (row.category_en?.trim() || categoryTr) : categoryTr,
  };
}

function displayDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

function todayInIstanbul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== "tr" && locale !== "en") return {};
  const faceoff = await getFaceoff(slug, locale);
  if (!faceoff) return { title: locale === "en" ? "Faceoff Not Found | FootBattle" : "Kapışma Bulunamadı | FootBattle", robots: { index: false, follow: false } };
  const en = locale === "en";
  const title = en ? `${faceoff.left_name} vs ${faceoff.right_name} | FootBattle` : `${faceoff.left_name} mi ${faceoff.right_name} mı? | FootBattle`;
  const description = en
    ? `${faceoff.left_name} and ${faceoff.right_name} go head to head in ${faceoff.displayCategory}. Who would you pick in the FootBattle Daily Faceoff?`
    : `${faceoff.left_name} ve ${faceoff.right_name} karşı karşıya. ${faceoff.displayCategory} kapışmasında sen kimi seçerdin? FootBattle Günün Kapışması.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/daily-faceoff/${slug}`,
      languages: { tr: `${SITE_URL}/tr/daily-faceoff/${slug}`, en: `${SITE_URL}/en/daily-faceoff/${slug}`, "x-default": `${SITE_URL}/tr/daily-faceoff/${slug}` },
    },
    openGraph: { title, description, url: `${SITE_URL}/${locale}/daily-faceoff/${slug}`, locale: en ? "en_US" : "tr_TR", alternateLocale: [en ? "tr_TR" : "en_US"], type: "website" },
  };
}

export default async function LocalizedFaceoffDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (locale !== "tr" && locale !== "en") notFound();
  const faceoff = await getFaceoff(slug, locale);
  if (!faceoff) notFound();
  const en = locale === "en";
  const isToday = faceoff.match_date === todayInIstanbul();
  const description = en
    ? `${faceoff.left_name} and ${faceoff.right_name} meet in the ${faceoff.displayCategory} category. Which side are you taking?`
    : `${faceoff.left_name} ve ${faceoff.right_name}, ${faceoff.displayCategory} kategorisinde karşı karşıya geliyor. Senin seçimin hangisi?`;
  const canonical = `${SITE_URL}/${locale}/daily-faceoff/${slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Game",
    name: `${faceoff.left_name} vs ${faceoff.right_name}`,
    description,
    url: canonical,
    inLanguage: en ? "en-US" : "tr-TR",
    applicationCategory: "Game",
    genre: ["Football", "Sports", "Voting"],
    datePublished: faceoff.match_date,
    publisher: { "@type": "Organization", name: "FootBattle", url: SITE_URL },
  };

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2"><Link href={`/${locale}/daily-faceoff`} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300">← {en ? "Daily Faceoff" : "Günün Kapışması"}</Link><Link href={`/${locale}`} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300">{en ? "Home" : "Ana Sayfa"}</Link></div>
          <div className="flex gap-1 rounded-xl border border-white/10 p-1 text-xs font-black"><Link href={`/tr/daily-faceoff/${slug}`} className={`rounded-lg px-3 py-2 ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>🇹🇷 TR</Link><Link href={`/en/daily-faceoff/${slug}`} className={`rounded-lg px-3 py-2 ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>🇬🇧 EN</Link></div>
        </div>

        <header className="mt-8 text-center"><p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">⚔️ {faceoff.displayCategory}</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{faceoff.left_name} <span className="text-red-400">vs</span> {faceoff.right_name}</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">{description}</p><p className="mt-3 text-xs font-bold text-slate-500">{displayDate(faceoff.match_date, locale)} · FootBattle Arena</p></header>

        <section className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch"><article className="flex min-h-48 items-center justify-center rounded-3xl border border-green-400/20 bg-green-400/[0.055] p-6 text-center sm:min-h-64"><h2 className="text-3xl font-black text-green-100 sm:text-4xl">{faceoff.left_name}</h2></article><div className="flex items-center justify-center"><span className="rounded-full bg-red-500 px-4 py-3 text-sm font-black">VS</span></div><article className="flex min-h-48 items-center justify-center rounded-3xl border border-purple-400/20 bg-purple-400/[0.055] p-6 text-center sm:min-h-64"><h2 className="text-3xl font-black text-purple-100 sm:text-4xl">{faceoff.right_name}</h2></article></section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0d1828] p-6 sm:p-8"><h2 className="text-2xl font-black">{en ? "Who would you pick?" : "Sen kimi seçerdin?"}</h2><p className="mt-3 leading-7 text-slate-400">{en ? `There is no single right answer in this ${faceoff.left_name} vs ${faceoff.right_name} debate. Make your call, then compare it with the FootBattle community.` : `${faceoff.left_name} ve ${faceoff.right_name} arasındaki bu kapışmada tek doğru cevap yok. Kendi kriterlerine göre seçimini yap ve FootBattle topluluğuyla karşılaştır.`}</p><Link href={`/${locale}/daily-faceoff`} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-6 font-black text-[#07111f]">{isToday ? (en ? "🔥 Vote in today's faceoff" : "🔥 Bugünkü kapışmada oy ver") : (en ? "⚔️ Go to today's new faceoff" : "⚔️ Bugünün yeni kapışmasına git")}</Link></section>
      </div>
    </main>
  );
}
