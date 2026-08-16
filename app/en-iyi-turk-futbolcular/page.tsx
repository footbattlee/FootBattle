import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "En iyi Türk futbolcular kimler? Farklı jenerasyonlardan yıldızları karşılaştır, futbol bilgini test et ve kendi favorini FootBattle oyunlarında seç.";

export const metadata = createGameMetadata({
  path: "/en-iyi-turk-futbolcular",
  title: "En İyi Türk Futbolcular | FootBattle",
  description,
  keywords: ["en iyi türk futbolcular", "türk futbol efsaneleri", "arda güler", "hakan çalhanoğlu", "nihat kahveci", "türk futbolcular"],
});

export default function Page() {
  return (
    <>
      <GameJsonLd name="En İyi Türk Futbolcular" description={description} path="/en-iyi-turk-futbolcular" />
      <SeoLandingPage
        eyebrow="Jenerasyonları karşılaştır"
        title="En İyi Türk Futbolcular"
        intro="Türk futbol tarihinin en iyi oyuncusunu seçmek kolay değil. Farklı dönemlerde, farklı liglerde ve farklı rollerde öne çıkan isimleri aynı ölçüyle değerlendirmek mümkün olmayabilir. Yine de futbolseverlerin en sevdiği tartışmalardan biri tam olarak bu."
        ctaHref="/survivor"
        ctaLabel="Kendi Şampiyonunu Seç 👑"
        sections={[
          { title: "En iyi Türk futbolcu nasıl seçilir?", paragraphs: ["Bir oyuncuyu değerlendirirken yalnızca gol ve asist sayıları yeterli değildir. Milli takım performansı, Avrupa'daki kariyer, kulüp düzeyindeki başarı, oyun zekâsı, teknik kalite ve uzun süre üst seviyede kalabilmek gibi birçok farklı kriter devreye girer.", "Bu nedenle Nihat Kahveci, Tugay Kerimoğlu, Arda Turan, Hakan Çalhanoğlu, Rüştü Reçber veya yeni jenerasyondan Arda Güler gibi isimleri karşılaştırırken herkes farklı bir özelliğe ağırlık verebilir. Bir taraftar için Avrupa kariyeri belirleyiciyken diğeri milli takım anılarını daha değerli görebilir."], bullets: ["Kulüp kariyeri", "Milli takım etkisi", "Teknik kalite", "Avrupa performansı"] },
          { title: "Farklı dönemleri karşılaştırmak neden zor?", paragraphs: ["Futbolun temposu, taktik anlayışı ve oyuncuların görevleri yıllar içinde değişti. Daha eski jenerasyonların oynadığı şartlarla bugünün futbolunu birebir karşılaştırmak doğru sonuç vermeyebilir. Bu yüzden 'en iyi' listeleri kesin sıralama değil, tartışma başlangıcı olarak görülmeli.", "FootBattle'ın oyun formatı da bu fikri destekler. Sana tek doğru liste vermek yerine seçimleri sen yaparsın. Eşleşme eşleşme ilerleyerek hangi oyuncuyu neden tercih ettiğini daha net görürsün."] },
          { title: "Bilgini oyunlarla test et", paragraphs: ["Türk futbolcuları ve kariyerlerini iyi bildiğini düşünüyorsan Guess The Player, Player Quiz ve Career Path senin için iyi testlerdir. Bir oyuncunun milliyeti, kulüp geçmişi veya kariyer yolu doğru cevaba ulaşmanda belirleyici olabilir.", "Survivor tarafında ise bilgi kadar kişisel tercih de önemlidir. 16 oyuncudan başlayıp finalde tek bir isim bıraktığında ortaya senin futbol zevkini yansıtan bir sonuç çıkar. Bu sonucu arkadaşlarınla paylaşarak aynı listeyi onların da çözmesini sağlayabilirsin."] }
        ]}
        faqs={[
          { question: "Türkiye'nin gelmiş geçmiş en iyi futbolcusu kim?", answer: "Tek bir kesin cevap yok. Kriterlere ve jenerasyona göre farklı isimler öne çıkabilir." },
          { question: "Türk futbolcularla Survivor yapılabilir mi?", answer: "Evet. FootBattle Survivor sisteminde admin tarafından 16 futbolculuk Türk futbolcu setleri hazırlanabilir." },
          { question: "Türk futbolcuları tahmin oyunlarında görebilir miyim?", answer: "Oyunun veri havuzuna bağlı olarak Türk futbolcular Guess The Player ve diğer quiz modlarında yer alabilir." }
        ]}
        relatedLinks={[
          { href: "/survivor", label: "Futbol Survivor", description: "16 futbolcudan kendi şampiyonunu oluştur." },
          { href: "/career-path", label: "Career Path", description: "Kulüp kariyerinden futbolcuyu bul." },
          { href: "/guess-the-player", label: "Guess The Player", description: "Futbolcu özelliklerinden doğru ismi tahmin et." }
        ]}
      />
    </>
  );
}
