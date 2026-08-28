import type { Metadata } from "next";

import SiteInfoPage from "@/components/SiteInfoPage";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "FootBattle Nedir? | Futbol Oyunları ve Quiz Platformu" },
  description: "FootBattle, playfootbattle.com üzerinde oynanan ücretsiz futbol oyunları, futbol quizleri, günlük görevler, Career Path, Wordle, Tic Tac Toe ve rekabetçi modlar sunan futbol oyun platformudur.",
  keywords: ["FootBattle", "Play FootBattle", "playfootbattle", "FootBattle oyun", "FootBattle futbol", "futbol oyunları", "football games", "football quiz"],
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: "FootBattle | Futbol Oyunları ve Quiz Platformu",
    description: "FootBattle hakkında bilgi alın; futbol quizleri, günlük mücadeleler ve rekabetçi oyunları keşfedin.",
    url: `${SITE_URL}/about`,
    siteName: "FootBattle",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <SiteInfoPage
      eyebrow="FOOTBATTLE"
      title="FootBattle Nedir?"
      intro="FootBattle (playfootbattle.com), futbol bilgisini kısa, rekabetçi ve paylaşılabilir oyunlara dönüştüren bağımsız bir futbol oyun ve quiz platformudur. Web'de ve Android uygulamasında futbolseverlerin günlük oyunlar oynamasını, futbol bilgisini test etmesini ve arkadaşlarıyla rekabet etmesini amaçlar."
    >
      <section>
        <h2 className="text-xl font-black text-white">FootBattle'da ne oynanır?</h2>
        <p className="mt-2">FootBattle; Guess The Player, Futbol Wordle, Player Quiz, Career Path, Futbol Tic Tac Toe, Transfer Quiz, Survivor ve farklı futbol mücadelelerini tek platformda bir araya getirir. Oyunlar kısa oturumlarla oynanabilecek ve tekrar denemeyi teşvik edecek şekilde tasarlanır.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Play FootBattle</h2>
        <p className="mt-2">FootBattle'ın resmi web adresi playfootbattle.com'dur. Platform Türkçe ve İngilizce futbol oyunları sunar; mobil deneyim Android uygulamasıyla da desteklenir.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Amacımız</h2>
        <p className="mt-2">Kolay girilen, hızlı öğrenilen ve tekrar oynama isteği uyandıran futbol oyunları üretmek; günlük görevler, rekabetçi modlar ve kullanıcı geri bildirimleriyle FootBattle'ı sürekli geliştirmek.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Bağımsız proje</h2>
        <p className="mt-2">FootBattle bağımsız olarak geliştirilen bir projedir. Kulüpler, ligler veya futbolcularla resmi bir sponsorluk ya da temsil ilişkisi olduğu anlamına gelmez.</p>
      </section>
    </SiteInfoPage>
  );
}
