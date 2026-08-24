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
        <p className="mt-2">Hesap oluşturduğunuzda e-posta adresi, kullanıcı adı, görünen ad ve profil görseli gibi kimlik doğrulama ve profil için gerekli bilgiler işlenebilir. Oyun oynadığınızda skor, oyun sonucu, oturum, sıralama, düello ve ilerleme bilgileri saklanabilir. Güvenlik, hata ayıklama ve performans amacıyla sınırlı teknik günlükler de tutulabilir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Giriş ve hesap altyapısı</h2>
        <p className="mt-2">E-posta ile girişin yanında Google ile giriş seçeneği sunabiliriz. Kimlik doğrulama, kullanıcı profilleri ve oyun verilerinin saklanması için Supabase altyapısından yararlanıyoruz. Google ile giriş kullanıldığında Google tarafından sağlanan temel hesap bilgileri yalnızca hesabınızı oluşturmak ve oturum açmanızı sağlamak amacıyla işlenir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Analitik ve performans</h2>
        <p className="mt-2">Uygulama ve site kullanımını anlamak için oyun başlangıcı/tamamlanması, paylaşım, düello ve Ranked gibi ürün olaylarını ölçebiliriz. Ayrıca Vercel Analytics ve benzeri performans araçlarından yararlanabiliriz. Bu veriler ürün deneyimini iyileştirmek, hataları tespit etmek ve kullanım eğilimlerini ölçmek amacıyla değerlendirilir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Bildirimler</h2>
        <p className="mt-2">Android uygulamasında arkadaşlık isteği, düello daveti ve düello güncellemeleri gibi bildirimleri göndermek için Firebase Cloud Messaging kullanabiliriz. Bunun için cihazınıza ait bildirim belirteci hesabınızla ilişkilendirilebilir. Bildirim iznini cihaz ayarlarından yönetebilirsiniz.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Reklamlar ve çerezler</h2>
        <p className="mt-2">Google AdSense gibi reklam hizmetleri, uygun olduğu durumlarda reklam göstermek ve reklam performansını ölçmek için çerezler veya benzer teknolojiler kullanabilir. Bölgenize göre gerekli kullanıcı rızası mekanizmaları uygulanabilir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Verilerin kullanım amacı</h2>
        <p className="mt-2">Veriler; hesabınızı ve sosyal özellikleri çalıştırmak, skor ve sıralamaları hesaplamak, Ranked ve Düello eşleşmelerini yürütmek, bildirim göndermek, kötüye kullanımı önlemek, uygulama güvenliğini sağlamak ve FootBattle deneyimini geliştirmek için gerekli olduğu ölçüde işlenir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Haklarınız ve silme talepleri</h2>
        <p className="mt-2">Kişisel verilerinizle ilgili erişim, düzeltme veya silme talebinde bulunabilirsiniz. Hesap silme akışı ve Play Store için gerekli harici silme talebi bağlantısı yayın öncesinde FootBattle içinde ayrıca sunulacaktır.</p>
      </section>
      <p className="text-xs text-slate-500">Son güncelleme: 24 Ağustos 2026</p>
    </SiteInfoPage>
  );
}
