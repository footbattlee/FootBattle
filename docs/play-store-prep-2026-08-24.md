# FootBattle — Google Play Hazırlık Paketi

Tarih: 24 Ağustos 2026

## Store Listing

**Uygulama adı**
FootBattle

**Kısa açıklama**
Futbol bilgini test et, solo oyna, Ranked'da yüksel ve arkadaşlarına meydan oku.

**Uzun açıklama**
FootBattle, futbol bilgini eğlenceli mini oyunlar ve rekabetçi modlarla test edebileceğin bir futbol oyunları platformudur.

Oyuncuları, kulüpleri, kariyer yollarını ve futbol bağlantılarını ne kadar iyi bildiğini farklı oyunlarda göster. Solo oyunlarda puan topla, Solo Rating sıralamasında yüksel, Ranked maçlarda rakip ara ve arkadaşlarına Düello gönder.

FootBattle'da:

• Futbol Wordle ile futbolcunun soyadını tahmin et.
• Guess the Player ile ipuçlarından oyuncuyu bul.
• Player Quiz ve Transfer Quiz ile futbol bilgini test et.
• Career Path ile oyuncunun kariyer yolunu çöz.
• Futbol Tic Tac Toe'da doğru futbolcularla 3x3 alanı tamamla.
• 2 Takım 1 Oyuncu'da iki kulüpte de forma giymiş futbolcuyu bul.
• 1 Takım 1 Millet'te kulüp ve ülke bağlantılarını yakala.
• Solo oyunlardan kazandığın puanlarla Solo Rating sıralamasında yüksel.
• Ranked modunda gerçek oyuncularla veya eşleşme bulunamadığında bot rakiple mücadele et.
• Düello sistemiyle arkadaşlarına doğrudan meydan oku.
• Profil, arkadaşlık ve sıralama özellikleriyle FootBattle topluluğunda yerini al.

FootBattle'ın amacı basit: futbolu biliyorsan kanıtla.

Yeni oyunlar, veri güncellemeleri ve rekabet özellikleri zaman içinde geliştirilmeye devam eder.

## Store Classification Taslağı

- Tür: Oyun
- Ana kategori önerisi: Trivia / Bilgi yarışması
- Temel özellikler: futbol bilgi oyunları, solo puanlama, Ranked, Düello, arkadaşlar, profil ve sıralamalar
- Giriş: e-posta ve Google ile giriş; bazı solo özellikler anonim kullanılabilir

## App Access / Reviewer Metni

FootBattle'ın temel solo oyunlarının bir bölümü hesap oluşturmadan kullanılabilir. Profil, arkadaşlık, Düello ve Ranked özellikleri için kullanıcı hesabı gerekir. İnceleme sırasında Google ile giriş veya e-posta ile kayıt/giriş kullanılabilir. Ranked ekranında oyun seçildikten sonra rakip araması başlar; uygun gerçek oyuncu bulunamazsa kısa bir beklemenin ardından bot rakip devreye girebilir.

## Data Safety Teknik Envanter — Taslak

FootBattle aşağıdaki veri kategorilerini işleyebilir:

- E-posta adresi: hesap oluşturma, giriş ve hesap yönetimi
- Kullanıcı adı / görünen ad / profil görseli: profil ve sosyal özellikler
- Kullanıcı kimliği: oturum, profil, arkadaşlık, Ranked ve Düello kayıtlarını kullanıcıya bağlama
- Oyun aktivitesi: skor, tamamlanma, oyun oturumu, Solo Rating, Ranked sonuçları, Düello sonuçları
- Uygulama etkileşimleri: oyun başlangıcı/tamamlanması, paylaşım, Ranked/Düello analitik eventleri
- Cihaz veya diğer tanımlayıcılar: Firebase Cloud Messaging bildirim token'ı
- Teknik günlükler / crash verisi: hata ayıklama, güvenlik ve uygulama performansı

Kullanım amaçları: uygulama işlevselliği, hesap yönetimi, sosyal özellikler, analitik, güvenlik/fraud prevention, bildirim ve uygulama performansı.

Veriler HTTPS üzerinden aktarılır. Supabase hesap/oyun verisi altyapısı, Firebase Cloud Messaging bildirim altyapısı ve Vercel/uygulama analitik altyapısı kullanılabilir. Üçüncü taraf SDK davranışları Play Console Data Safety formu gönderilmeden önce final AAB üzerinden tekrar doğrulanmalıdır.

## Privacy Policy

Canlı politika yolu: `/privacy`

Politikada Google giriş, Supabase, ürün analitiği, Firebase bildirim token'ı, reklam/çerez olasılığı ve veri silme talepleri açık şekilde belirtilmelidir.

## Kritik Play Policy Açığı

FootBattle hesap oluşturmayı desteklediği için Google Play yayınından önce iki hesap silme yolu gereklidir:

1. Uygulama içinde kolay bulunabilir hesap silme / hesap silme talebi akışı.
2. Uygulama dışında erişilebilen web tabanlı hesap silme / silme talebi sayfası ve bu sayfanın Play Console'a URL olarak girilmesi.

Bu madde Closed/Production policy hazırlığında MUST olarak ele alınmalıdır.

## Yayın Sırası

1. Account deletion akışını tamamla.
2. Privacy Policy final kontrolünü yap.
3. Signed AAB üret.
4. Internal Testing kısa smoke.
5. Play Console App Content: Data Safety, Ads, Content Rating, Target Audience, App Access.
6. Store Listing metin ve görsellerini yükle.
7. Closed Testing track'i başlat.
