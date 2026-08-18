import type { Metadata } from "next";

import SiteInfoPage from "@/components/SiteInfoPage";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "FootBattle hakkında bilgi.",
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
        <h2 className="text-xl font-black text-white">Ne yapıyoruz?</h2>
        <p className="mt-2">Guess The Player, Wordle, Player Quiz, Tic Tac Toe, Günün Kapışması, Survivor ve farklı futbol oyunlarıyla kullanıcıların futbol bilgisini test etmesini ve arkadaşlarıyla rekabet etmesini sağlıyoruz.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Amacımız</h2>
        <p className="mt-2">Kolay girilen, hızlı öğrenilen ve tekrar oynama isteği uyandıran futbol oyunları üretmek; kullanıcı geri bildirimleriyle platformu her hafta daha iyi hale getirmek.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Bağımsız proje</h2>
        <p className="mt-2">FootBattle bağımsız olarak geliştirilen bir projedir. Kulüpler, ligler veya futbolcularla resmi bir sponsorluk ya da temsil ilişkisi olduğu anlamına gelmez.</p>
      </section>
    </SiteInfoPage>
  );
}
