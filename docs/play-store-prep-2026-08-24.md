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

## Data Safety — Final Teknik Beyan Taslağı

Bu bölüm Play Console'a girilecek cevapların teknik kaynağıdır. Final signed AAB Play Console'a yüklendiğinde Google'ın AAB/SDK uyarılarıyla son kez karşılaştırılmalıdır.

### Üst seviye cevaplar

- Uygulama kullanıcı verisi topluyor mu? **Evet.**
- Kullanıcı verisi üçüncü taraflarla paylaşılıyor mu? **Hayır** (Supabase, Firebase ve Vercel FootBattle adına altyapı/hizmet sağlayıcı olarak kullanılıyor; reklam ağı veya veri brokerına kullanıcı verisi aktarımı bu sürümde yok).
- Veriler aktarım sırasında şifreleniyor mu? **Evet — HTTPS/TLS.**
- Kullanıcı veri silme talep edebilir mi? **Evet.** Uygulama içi Profil > Hesabı Sil ve herkese açık `/account-deletion` akışı mevcut.

### Play Console'da işaretlenecek veri tipleri

| Play veri tipi | Toplanıyor | Paylaşılıyor | Zorunlu / Opsiyonel | Amaç |
|---|---|---|---|---|
| Personal info > Email address | Evet | Hayır | Hesap özellikleri için zorunlu; anonim solo kullanımda toplanmaz | App functionality, Account management |
| Personal info > Name | Evet, Google profil adı/görünen ad mevcutsa | Hayır | Opsiyonel / Google girişine bağlı | App functionality, Account management |
| Personal info > User IDs | Evet | Hayır | Hesap özellikleri için zorunlu | App functionality, Account management, Fraud prevention/security |
| App activity > App interactions | Evet | Hayır | Otomatik | Analytics, App functionality |
| App activity > Other actions | Evet | Hayır | Oyun kullanıldığında | App functionality, Analytics |
| App info and performance > Crash logs | Evet | Hayır | Otomatik (Android Crashlytics) | Analytics |
| App info and performance > Diagnostics | Evet | Hayır | Otomatik (Crashlytics/Firebase runtime metadata) | Analytics |
| Device or other IDs | Evet | Hayır | Otomatik / push özellikleriyle ilişkili | App functionality, Analytics |

### Veri tipi açıklamaları

**Email address** — Supabase Auth / Google Sign-In ile hesap oluşturma ve giriş için kullanılır. Hesap, profil, arkadaş, Ranked ve Düello özelliklerinin çalışması için gerekir. Kullanıcı yalnız anonim solo özellikleri kullanırsa e-posta vermek zorunda değildir.

**Name** — Google hesabından dönen ad/görünen ad veya kullanıcının profilinde kullandığı görünen isim. Sosyal/profil deneyimi ve hesap yönetimi içindir.

**User IDs** — Supabase auth user ID ve uygulama içi kullanıcı kimliği; skorları, Solo Rating'i, Ranked/Düello/arkadaşlık kayıtlarını doğru hesaba bağlamak ve yetkilendirme/güvenlik için kullanılır.

**App interactions** — FootBattle'ın kendi `analytics_events` altyapısında oyun başlangıcı/tamamlanması, tekrar oynama, paylaşım ve ilgili ürün etkileşimleri tutulur. Amaç ürün analitiği ve oyun funnel'larını ölçmektir.

**Other actions** — Oyun skorları, tamamlanma, oyun session'ları, Ranked/Düello sonuçları ve Solo Rating'e etki eden gameplay aksiyonları. Ana amaç uygulama işlevselliğidir; toplu performans analizi için de kullanılır.

**Crash logs / Diagnostics** — Android release build Firebase Crashlytics içerir. Crash stack trace, ilgili uygulama durumu, cihaz/app metadata ve Crashlytics installation UUID gibi teşhis verileri crash yönetimi için Firebase'e iletilebilir.

**Device or other IDs** — Firebase Installations/Crashlytics installation kimlikleri ve push notification için FCM token gibi uygulama/cihaz örneği tanımlayıcıları kullanılabilir. FCM token FootBattle backend'inde kullanıcıya bağlanarak arkadaşlık ve Düello bildirimlerinin doğru cihaza gönderilmesini sağlar.

### Şu anda işaretlenmeyecek veri tipleri

- Location: uygulama konum izni istemiyor ve ürün özelliği olarak konum toplamıyor.
- Contacts: cihaz rehberi okunmuyor.
- Photos / Videos / Audio files: kullanıcı cihazından medya dosyası toplanmıyor.
- Health / Fitness: yok.
- Financial info / Purchase history: bu sürümde uygulama içi ödeme yok.
- Messages (SMS/MMS/email message content): yok.
- Files and docs: yok.
- Calendar: yok.
- Web browsing history: yok.
- Installed apps: yok.

### SDK / altyapı eşleştirmesi

- **Supabase Auth + Database:** email, user ID, profil ve oyun/sosyal kayıtlarının saklanması.
- **Google Sign-In / Capacitor Firebase Authentication:** kullanıcı talep ederse Google hesabıyla kimlik doğrulama.
- **Firebase Cloud Messaging:** push notification delivery; FCM token ve Firebase Installations bağımlılığı.
- **Firebase Crashlytics:** crash logs, diagnostics, installation/session identifiers.
- **Vercel Analytics:** web/uygulama kullanım ölçümü; final AAB sonrası Play'in SDK/Data Safety uyarılarıyla tekrar çapraz kontrol edilecek.
- **FootBattle analytics_events:** first-party app interactions ve oyun eventleri.

### Güvenlik ve silme

- Uygulama production URL'si HTTPS kullanır.
- Hassas Android permissions için CI fail-fast manifest audit'i vardır.
- Hesap silindiğinde doğrudan kullanıcıya bağlı veriler CASCADE ile silinir; geçmiş kayıtların kullanıcı referansı korunması gerekmeyen yerlerde SET NULL ile anonimleştirilir.
- Public deletion URL: `https://playfootbattle.com/account-deletion`.

## Privacy Policy

Canlı politika yolu: `/privacy`

Politika Google giriş, Supabase, ürün analitiği, Firebase bildirim token'ı, Crashlytics/diagnostics ve hesap silme akışlarını açıklamalıdır.

## Account Deletion — Tamamlandı

1. Uygulama içinde Profil sayfasından kalıcı hesap silme akışı mevcut.
2. Uygulama dışında `https://playfootbattle.com/account-deletion` sayfası mevcut.
3. Auth user silme endpoint'i ve ilişkili FK cleanup uygulanmıştır.

## Yayın Sırası

1. Privacy Policy final kontrolü.
2. Signed AAB üret.
3. Internal Testing kısa smoke.
4. Play Console App Content: Data Safety, Ads, Content Rating, Target Audience, App Access.
5. Store Listing metin ve görsellerini yükle.
6. Closed Testing track'i başlat.
