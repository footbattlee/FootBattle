import Link from "next/link";

import { SITE_URL } from "@/lib/seo";

type SurvivorSeoEntry = {
  name: string;
};

type SurvivorSeoProps = {
  slug: string;
  title: string;
  description: string;
  kind: "player" | "team";
  entries: SurvivorSeoEntry[];
};

export function SurvivorSeoContent({ slug, title, description, kind, entries }: SurvivorSeoProps) {
  const participantLabel = kind === "team" ? "takım" : "futbolcu";
  const names = entries.map((entry) => entry.name).filter(Boolean);
  const previewNames = names.slice(0, 8);
  const pageUrl = `${SITE_URL}/survivor/${slug}`;

  const faq = [
    {
      question: `${title} Survivor nasıl oynanır?`,
      answer: `16 ${participantLabel} turnuva ağacına yerleşir. Her eşleşmede bir tarafı seçersin; kazananlar çeyrek final, yarı final ve final boyunca aynı bracket içinde ilerler. 15 seçim sonunda kendi şampiyonunu belirlersin.`,
    },
    {
      question: "Eşleşmeler her tur yeniden karışıyor mu?",
      answer: "Hayır. Katılımcılar oyun başında bir kez rastgele yerleştirilir. Oyun başladıktan sonra turnuva ağacı sabit kalır ve kazananlar kendi dallarında ilerler.",
    },
    {
      question: "Survivor sonucu paylaşılabilir mi?",
      answer: "Evet. Final bittiğinde seçtiğin şampiyonu FootBattle bağlantısıyla birlikte paylaşabilirsin.",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Game",
        name: `${title} Survivor`,
        description,
        url: pageUrl,
        inLanguage: "tr-TR",
        applicationCategory: "Game",
        genre: ["Football", "Sports", "Bracket"],
        numberOfPlayers: 1,
        publisher: {
          "@type": "Organization",
          name: "FootBattle",
          url: SITE_URL,
        },
      },
      {
        "@type": "ItemList",
        name: `${title} katılımcıları`,
        numberOfItems: names.length,
        itemListElement: names.map((name, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "FootBattle", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Survivor", item: `${SITE_URL}/survivor` },
          { "@type": "ListItem", position: 3, name: title, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <section className="bg-[#07111f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">FootBattle Survivor</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">{title}: kendi şampiyonunu seç</h2>
          <p className="mt-4 leading-7 text-slate-300">
            {description || `${title}, 16 ${participantLabel} arasından kendi şampiyonunu belirlediğin futbol eleme oyunudur.`}
            {` İlk tur eşleşmeleri yalnızca oyun başlarken karışır; daha sonra kazananlar sabit turnuva ağacında ilerler. Böylece her seçim final yolunu doğrudan etkiler ve 15 karar sonunda senin ${title} şampiyonun ortaya çıkar.`}
          </p>

          {previewNames.length > 0 && (
            <div className="mt-7">
              <h3 className="text-lg font-black">Kimler var?</h3>
              <p className="mt-2 leading-7 text-slate-400">
                Bu Survivor setinde {previewNames.join(", ")}{names.length > previewNames.length ? " ve diğer güçlü adaylar" : ""} yer alıyor. Eşleşmelerin sırası her yeni oyunda değişebildiği için aynı seti yeniden oynadığında farklı bir final yolu oluşabilir.
              </p>
            </div>
          )}

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-[#07111f] p-4">
              <h3 className="font-black">Nasıl ilerliyor?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Son 16’dan başlayan bracket; çeyrek final, yarı final ve final ile devam eder. Kazanan seçimlerin aynı dalda ilerler, her tur yeniden shuffle yapılmaz.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-[#07111f] p-4">
              <h3 className="font-black">Finalden sonra</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Şampiyonunu belirledikten sonra sonucunu arkadaşlarınla paylaşabilir ve aynı 16’lı seti farklı başlangıç eşleşmeleriyle yeniden oynayabilirsin.</p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-7">
            <h3 className="text-lg font-black">Sık sorulanlar</h3>
            <div className="mt-4 space-y-4">
              {faq.map((item) => (
                <div key={item.question}>
                  <h4 className="font-black text-slate-100">{item.question}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6 text-sm font-bold">
            <Link href="/survivor" className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-yellow-100">Diğer Survivor oyunları</Link>
            <Link href="/super-lig-efsaneleri" className="rounded-xl border border-white/10 px-4 py-2 text-slate-300">Süper Lig Efsaneleri</Link>
            <Link href="/futbol-oyunlari" className="rounded-xl border border-white/10 px-4 py-2 text-slate-300">Tüm futbol oyunları</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
