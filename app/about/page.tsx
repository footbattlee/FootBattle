import Link from "next/link";
import type { Metadata } from "next";

import SiteInfoPage from "@/components/SiteInfoPage";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hakkımızda | FootBattle",
  description: "FootBattle'ın futbol oyunları, proje amacı ve platform yaklaşımı hakkında bilgi alın.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function AboutPage() {
  return (
    <SiteInfoPage
      eyebrow="FOOTBATTLE"
      title="Hakkımızda"
      intro="FootBattle, futbol bilgisini kısa, rekabetçi ve paylaşılabilir oyunlara dönüştüren bağımsız bir futbol oyun platformudur."
    >
      <section>
        <h2 className="text-xl font-black text-white">FootBattle nedir?</h2>
        <p className="mt-2">FootBattle; futbolcuları, kulüpleri, kariyerleri, transferleri ve futbol hafızasını farklı oyun mekanikleriyle buluşturan bir platformdur. Amaç, uzun kurallar öğrenmeden birkaç dakika içinde başlayabileceğin oyunlarla futbol bilgini sınamak ve aynı konuyu farklı formatlarda yeniden keşfetmeni sağlamaktır.</p>
        <p className="mt-3">Platformda tahmin, kelime bulmaca, kariyer yolu, bilgi yarışması, karşılaştırma ve strateji temelli oyunlar bir arada bulunur. Böylece yalnızca güncel futbolu takip edenler değil, geçmiş sezonları, eski transferleri ve unutulmaz oyuncuları hatırlayan futbolseverler de kendilerine uygun bir oyun bulabilir.</p>
      </section>

      <section>
        <h2 className="text-xl font-black text-white">Ne yapıyoruz?</h2>
        <p className="mt-2">Guess The Player, Wordle, Player Quiz, Tic Tac Toe, Günün Kapışması, Survivor, Career Path ve Transferi Bil gibi oyunlarla kullanıcıların futbol bilgisini farklı açılardan test etmesini sağlıyoruz. Bazı oyunlarda doğru futbolcuyu özelliklerinden bulmak gerekirken bazılarında kulüp kariyeri, transfer rotası, kelime bilgisi veya kişisel futbol tercihleri öne çıkar.</p>
        <p className="mt-3">Oyunların ortak noktası hızlı anlaşılır olmalarıdır. Kullanıcı mümkün olduğunca kısa sürede oyuna girebilmeli, ne yapması gerektiğini anlayabilmeli ve tur sonunda sonucunu görebilmelidir. Bu nedenle FootBattle'da oyun ekranları kadar açıklayıcı içeriklere, mobil kullanılabilirliğe ve oyunlar arasında kolay geçişe de önem veriyoruz.</p>
      </section>

      <section>
        <h2 className="text-xl font-black text-white">Amacımız</h2>
        <p className="mt-2">Kolay girilen, hızlı öğrenilen ve tekrar oynama isteği uyandıran futbol oyunları üretmek; kullanıcı geri bildirimleriyle platformu düzenli olarak geliştirmek istiyoruz. FootBattle'ın yalnızca tek bir oyundan oluşan bir site yerine futbolseverlerin farklı bilgi alanlarını deneyebileceği bir oyun koleksiyonu olması hedefleniyor.</p>
        <p className="mt-3">Yeni oyun fikirleri geliştirirken futbol bilgisinin gerçekten oyunun parçası olmasına dikkat ediyoruz. Bir futbolcunun kariyer yolunu hatırlamak, iki kulüp arasındaki transferi çözmek veya bir 3x3 tahtada iki kriteri aynı anda karşılayan oyuncuyu bulmak gibi mekanikler, futbol bilgisini doğrudan oynanışın içine taşır.</p>
      </section>

      <section>
        <h2 className="text-xl font-black text-white">İçerik ve oyun yaklaşımımız</h2>
        <p className="mt-2">FootBattle'daki açıklayıcı sayfalar yalnızca oyun bağlantısı vermek için değil, oyunun mantığını ve hangi futbol bilgisinin işe yaradığını anlatmak için hazırlanır. Oyun kuralları değiştiğinde veya yeni bir format eklendiğinde ilgili içerikleri de güncel tutmayı amaçlıyoruz.</p>
        <p className="mt-3">Futbol verileri çok geniş ve zamanla değişen bir alan olduğu için oyun deneyimini geliştirmeye devam ediyoruz. Bir içerikte veya oyunda düzeltilmesi gerektiğini düşündüğün bir nokta varsa iletişim sayfasından bize ulaşabilirsin.</p>
      </section>

      <section>
        <h2 className="text-xl font-black text-white">Bağımsız proje</h2>
        <p className="mt-2">FootBattle bağımsız olarak geliştirilen bir projedir. Kulüpler, ligler veya futbolcularla resmi bir sponsorluk, ortaklık ya da temsil ilişkisi olduğu anlamına gelmez. Platformdaki oyunlar futbolseverlere eğlenceli ve rekabetçi bir deneyim sunmak amacıyla geliştirilir.</p>
      </section>

      <section>
        <h2 className="text-xl font-black text-white">FootBattle'ı keşfet</h2>
        <p className="mt-2">Platformdaki oyunları tek yerde görmek veya proje hakkında bize ulaşmak için aşağıdaki sayfalardan devam edebilirsin.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/futbol-oyunlari" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Futbol Oyunları</Link>
          <Link href="/transfer-quiz" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Transferi Bil</Link>
          <Link href="/contact" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">İletişim</Link>
        </div>
      </section>
    </SiteInfoPage>
  );
}
