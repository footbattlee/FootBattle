import type { Metadata } from "next";

import SiteInfoPage from "@/components/SiteInfoPage";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "FootBattle gizlilik politikası ve veri kullanımı hakkında bilgi.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <SiteInfoPage
      eyebrow="YASAL"
      title="Gizlilik Politikası"
      intro="FootBattle'da hangi verilerin neden işlendiğini ve üçüncü taraf hizmetlerin nasıl kullanıldığını açık şekilde anlatıyoruz."
    >
      <section>
        <h2 className="text-xl font-black text-white">Toplanan bilgiler</h2>
        <p className="mt-2">Hesap oluşturduğunuzda kimlik doğrulama ve profil için gerekli bilgiler; oyun oynadığınızda skor, oyun sonucu, oturum ve ilerleme bilgileri işlenebilir. Güvenlik ve performans amacıyla teknik günlükler de tutulabilir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Analitik ve performans</h2>
        <p className="mt-2">Site kullanımını ve performansını anlamak için Vercel Analytics gibi analitik hizmetleri kullanabiliriz. Bu veriler ürün deneyimini iyileştirmek, hataları tespit etmek ve kullanım eğilimlerini ölçmek amacıyla değerlendirilir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Reklamlar ve çerezler</h2>
        <p className="mt-2">Google AdSense gibi reklam hizmetleri, uygun olduğu durumlarda reklam göstermek ve reklam performansını ölçmek için çerezler veya benzer teknolojiler kullanabilir. Bölgenize göre gerekli kullanıcı rızası mekanizmaları uygulanabilir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Hesap ve oyun verileri</h2>
        <p className="mt-2">Kimlik doğrulama, kullanıcı profilleri ve oyun verilerinin saklanması için Supabase altyapısından yararlanabiliriz. Veriler yalnızca hizmetin sağlanması, güvenliği ve iyileştirilmesi için gerekli olduğu ölçüde işlenir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Haklarınız</h2>
        <p className="mt-2">Kişisel verilerinizle ilgili erişim, düzeltme veya silme taleplerinizi FootBattle'ın resmi iletişim kanalları üzerinden iletebilirsiniz.</p>
      </section>
      <p className="text-xs text-slate-500">Son güncelleme: 18 Ağustos 2026</p>
    </SiteInfoPage>
  );
}
