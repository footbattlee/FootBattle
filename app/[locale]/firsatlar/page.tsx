import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./firsatlar.css";

export const metadata: Metadata = {
  title: "Fırsatlar | Fiyatzade x FootBattle",
  description: "Fiyatzade tarafından takip edilen güncel indirim ve fırsatları keşfet. Fiyatları karşılaştır, fırsata doğrudan mağazadan ulaş.",
  alternates: { canonical: "https://playfootbattle.com/firsatlar" },
};

type Deal = { id:string; title:string; image_url:string|null; merchant:string; price:number; reference_price:number; discount_pct:number; product_url:string; published_at:string };

async function getDeals(): Promise<Deal[]> {
  try {
    const res = await fetch("https://cmexmobjpeavlppmffqi.supabase.co/functions/v1/public-deals", { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.deals) ? json.deals : [];
  } catch { return []; }
}

const money = (v:number) => new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:2}).format(Number(v||0));

export default async function FirsatlarPage({ params }: { params: Promise<{ locale: string }> }){\n  const { locale } = await params;
  const deals=await getDeals();
  return <main className="dealsPage"><div className="dealsWrap">
    <Link href={`/${locale}`} className="dealsBack">← FootBattle'a dön</Link>
    <section className="dealsHero">
      <div className="dealsKicker">FİYATZADE × FOOTBATTLE</div>
      <h1>Günün fırsatları 🔥</h1>
      <p>Fiyatzade farklı mağazalardaki fiyatları takip eder; dikkat çeken fırsatları burada toplar. Satın alma işlemi ilgili mağazanın kendi sitesinde tamamlanır.</p>
      <div className="dealsMeta"><span className="dealsPill">⚡ Güncel fırsatlar</span><span className="dealsPill">🔎 Fiyat karşılaştırma</span><span className="dealsPill">📸 Instagram: @anlikindirimradari</span></div>
    </section>
    {deals.length ? <section className="dealsGrid" aria-label="Güncel fırsatlar">{deals.map(d=><article className="dealCard" key={d.id}>
      <div className="dealImageWrap">{d.image_url ? <Image className="dealImage" src={d.image_url} alt={d.title} width={420} height={320} unoptimized /> : null}</div>
      <div className="dealBody"><div className="dealMerchant">{d.merchant}</div><h2 className="dealTitle">{d.title}</h2>
        <span className="dealDiscount">%{Number(d.discount_pct||0).toFixed(0)} daha uygun</span>
        <div className="dealPrices"><span className="dealPrice">{money(d.price)}</span>{d.reference_price ? <span className="dealRef">{money(d.reference_price)}</span>:null}</div>
        <a className="dealButton" href={d.product_url} target="_blank" rel="nofollow sponsored noopener noreferrer">Fırsata Git →</a>
      </div></article>)}</section> : <div className="dealsEmpty">Yeni fırsatlar hazırlanıyor. Biraz sonra tekrar kontrol et.</div>}
    <p className="dealNote">Fiyatlar mağazalarda değişebilir. Son fiyat ve stok bilgisi için mağaza sayfasını kontrol edin. Bazı bağlantılar ileride gelir ortaklığı bağlantısı olabilir; bu durumda uygun açıklamalar ayrıca gösterilecektir. Fiyatzade: <span className="fiyatzadeSocial">@anlikindirimradari</span></p>
  </div></main>
}