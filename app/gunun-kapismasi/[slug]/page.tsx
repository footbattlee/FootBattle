import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { faceoffSlug } from "@/lib/faceoff-seo";
import { createGameMetadata, SITE_URL } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;
type FaceoffRow = {
  id: string;
  match_date: string;
  title: string;
  category: string;
  left_name: string;
  right_name: string;
  is_active: boolean;
};

async function getFaceoff(slug: string): Promise<FaceoffRow | null> {
  const { data } = await supabaseAdmin
    .from("daily_faceoffs")
    .select("id, match_date, title, category, left_name, right_name, is_active")
    .eq("is_active", true)
    .order("match_date", { ascending: false });

  return (data ?? []).find((row) => faceoffSlug(row) === slug) ?? null;
}

function trDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

function todayInIstanbul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const faceoff = await getFaceoff(slug);

  if (!faceoff) {
    return {
      title: "Kapışma Bulunamadı | FootBattle",
      robots: { index: false, follow: false },
    };
  }

  const title = `${faceoff.left_name} mi ${faceoff.right_name} mı? | FootBattle`;
  const description = `${faceoff.left_name} ve ${faceoff.right_name} karşı karşıya. ${faceoff.category} kapışmasında sen kimi seçerdin? FootBattle Günün Kapışması.`;

  return createGameMetadata({
    path: `/gunun-kapismasi/${slug}`,
    title,
    description,
    keywords: [
      `${faceoff.left_name} mi ${faceoff.right_name} mı`,
      `${faceoff.left_name} vs ${faceoff.right_name}`,
      "günün kapışması",
      "futbolcu karşılaştırma",
      "futbol oylama",
      faceoff.category,
    ],
  });
}

export default async function FaceoffSeoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const faceoff = await getFaceoff(slug);
  if (!faceoff) notFound();

  const isToday = faceoff.match_date === todayInIstanbul();
  const canonical = `${SITE_URL}/gunun-kapismasi/${slug}`;
  const description = `${faceoff.left_name} ve ${faceoff.right_name}, ${faceoff.category} kategorisinde karşı karşıya geliyor. FootBattle topluluğunda senin seçimin hangisi olurdu?`;

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Game",
      name: `${faceoff.left_name} vs ${faceoff.right_name}`,
      description,
      url: canonical,
      inLanguage: "tr-TR",
      applicationCategory: "Game",
      genre: ["Football", "Sports", "Voting"],
      datePublished: faceoff.match_date,
      publisher: { "@type": "Organization", name: "FootBattle", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "FootBattle", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Günün Kapışması", item: `${SITE_URL}/gunun-kapismasi` },
        { "@type": "ListItem", position: 3, name: `${faceoff.left_name} vs ${faceoff.right_name}`, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `${faceoff.left_name} mi ${faceoff.right_name} mı?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "FootBattle Günün Kapışması'nda karar tamamen sana ait. İki futbolcudan birini seçerek topluluk oylamasına katılabilirsin.",
          },
        },
        {
          "@type": "Question",
          name: "Günün Kapışması nasıl oynanır?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Günün eşleşmesinde iki futbolcudan birini seçersin. Oyunu kullandıktan sonra topluluğun seçim oranlarını görebilirsin.",
          },
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap gap-2">
          <Link href="/gunun-kapismasi" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300">← Günün Kapışması</Link>
          <Link href="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300">Ana Sayfa</Link>
        </div>

        <header className="mt-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">⚔️ {faceoff.category}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{faceoff.left_name} <span className="text-red-400">vs</span> {faceoff.right_name}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
          <p className="mt-3 text-xs font-bold text-slate-500">{trDate(faceoff.match_date)} · FootBattle Arena</p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <article className="flex min-h-48 items-center justify-center rounded-3xl border border-green-400/20 bg-green-400/[0.055] p-6 text-center sm:min-h-64">
            <h2 className="text-3xl font-black text-green-100 sm:text-4xl">{faceoff.left_name}</h2>
          </article>
          <div className="flex items-center justify-center"><span className="rounded-full bg-red-500 px-4 py-3 text-sm font-black">VS</span></div>
          <article className="flex min-h-48 items-center justify-center rounded-3xl border border-purple-400/20 bg-purple-400/[0.055] p-6 text-center sm:min-h-64">
            <h2 className="text-3xl font-black text-purple-100 sm:text-4xl">{faceoff.right_name}</h2>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0d1828] p-6 sm:p-8">
          <h2 className="text-2xl font-black">Sen kimi seçerdin?</h2>
          <p className="mt-3 leading-7 text-slate-400">{faceoff.left_name} ve {faceoff.right_name} arasındaki bu kapışmada tek doğru cevap yok. Futbol bilgini, izlediğin dönemleri ve kendi kriterlerini kullanarak seçimini yap. FootBattle Günün Kapışması her gün yeni bir futbol tartışması açar.</p>
          {isToday ? (
            <Link href="/gunun-kapismasi" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-6 font-black text-[#07111f]">🔥 Bugünkü kapışmada oy ver</Link>
          ) : (
            <Link href="/gunun-kapismasi" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-yellow-300 px-6 font-black text-[#07111f]">⚔️ Bugünün yeni kapışmasına git</Link>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <h2 className="text-xl font-black">Günün Kapışması nedir?</h2>
          <p className="mt-3 leading-7 text-slate-400">FootBattle Günün Kapışması, iki futbolcuyu veya futbol dünyasından iki güçlü adayı karşı karşıya getirir. Kullanıcılar kendi favorisini seçer; oy verdikten sonra topluluğun hangi tarafa daha çok destek verdiğini görür.</p>
        </section>
      </div>
    </main>
  );
}
