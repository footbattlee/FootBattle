import type { Metadata } from "next";

import SiteInfoPage from "@/components/SiteInfoPage";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "FootBattle kullanım şartları.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <SiteInfoPage
      eyebrow="YASAL"
      title="Kullanım Şartları"
      intro="FootBattle'ı kullanarak aşağıdaki temel kullanım koşullarını kabul etmiş olursunuz."
    >
      <section>
        <h2 className="text-xl font-black text-white">Hizmetin kullanımı</h2>
        <p className="mt-2">FootBattle futbol temalı oyunlar, quizler, sosyal özellikler ve skor sistemleri sunar. Hizmeti hukuka uygun ve diğer kullanıcıların deneyimini bozmayacak biçimde kullanmanız gerekir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Hesaplar ve adil oyun</h2>
        <p className="mt-2">Hesabınızın güvenliğinden siz sorumlusunuz. Hile, otomasyon, manipülasyon, skor veya sıralama sistemini kötüye kullanma girişimleri kısıtlama ya da hesap erişiminin sonlandırılmasıyla sonuçlanabilir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">İçerik ve erişilebilirlik</h2>
        <p className="mt-2">Oyun içerikleri, sorular, oyuncu veya takım verileri zaman içinde değişebilir. Hizmetin belirli bir bölümünün kesintisiz, hatasız veya sürekli erişilebilir olacağı garanti edilmez.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Fikri mülkiyet</h2>
        <p className="mt-2">FootBattle markası, özgün arayüz, oyun kurguları ve site içeriği ilgili hak sahiplerinin haklarına tabidir. Üçüncü taraf marka ve isimleri yalnızca tanımlama ve futbol içeriği bağlamında kullanılabilir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Değişiklikler</h2>
        <p className="mt-2">Bu şartlar ürünün gelişimine veya yasal gerekliliklere göre güncellenebilir. Önemli değişiklikler bu sayfada yayımlanır.</p>
      </section>
      <p className="text-xs text-slate-500">Son güncelleme: 18 Ağustos 2026</p>
    </SiteInfoPage>
  );
}
