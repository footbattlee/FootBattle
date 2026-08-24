import { notFound } from "next/navigation";

const UPDATED = "24 Ağustos 2026";

const trSections = [
  ["Topladığımız veriler", "FootBattle; hesap oluşturma ve oturum açma sırasında e-posta adresi ve, kullanıcı tarafından sağlanmışsa, telefon numarası gibi hesap bilgilerini işleyebilir. Profil özellikleri kullanıldığında kullanıcı adı, görünen ad ve profil görseli bağlantısı saklanabilir. Oyun kullanımı sırasında oyun türü, skor, oyun süresi, oturum kimlikleri, sayfa/özellik kullanımı, düello ve sıralamalı maç bilgileri ile güvenlik ve kötüye kullanım önleme amaçlı teknik tanımlayıcılar işlenebilir. Bildirimler etkinleştirildiğinde cihazın push bildirim belirteci saklanabilir."],
  ["Verileri neden kullanıyoruz?", "Bu verileri hesap ve profil özelliklerini sağlamak, oyun ilerlemesini ve skorları kaydetmek, arkadaşlık/düello/sıralama özelliklerini çalıştırmak, bildirim göndermek, hizmet kullanımını ölçmek, hataları gidermek ve hile, kötüye kullanım veya güvenlik sorunlarını tespit etmek amacıyla kullanırız."],
  ["Hizmet sağlayıcılar", "FootBattle altyapısında kimlik doğrulama ve veri saklama için Supabase, uygulama barındırma ve kullanım analitiği için Vercel ve Android uygulamasındaki kimlik doğrulama/bildirim işlevleri için Firebase/Google hizmetlerinden yararlanabilir. Bu sağlayıcılar verileri kendi hizmet koşulları ve gizlilik yükümlülükleri kapsamında işleyebilir."],
  ["Çerezler ve yerel depolama", "Web ve Android WebView deneyiminde oturumun devam etmesi, kimlik doğrulama ve temel uygulama işlevleri için çerezler ve tarayıcı/cihaz yerel depolama teknolojileri kullanılabilir."],
  ["Veri paylaşımı ve satış", "Kişisel verilerinizi satmayız. Veriler yalnızca FootBattle hizmetini sunmak, güvenliğini sağlamak ve yukarıda belirtilen işlevleri yerine getirmek için gerekli hizmet sağlayıcılarla işlenebilir veya hukuken gerekli olduğu durumlarda yetkili mercilerle paylaşılabilir."],
  ["Saklama ve güvenlik", "Verileri hizmetin sağlanması, güvenlik, uyuşmazlıkların çözümü ve yasal yükümlülükler için gerekli olduğu süre boyunca saklamayı hedefleriz. Yetkisiz erişim, değişiklik veya ifşaya karşı makul teknik ve organizasyonel önlemler uygularız."],
  ["Haklarınız ve hesap silme", "Geçerli mevzuat kapsamında kişisel verilerinize erişme, düzeltme veya silinmesini talep etme gibi haklara sahip olabilirsiniz. Hesap veya kişisel veri silme talepleri için aşağıdaki iletişim kanalından bize ulaşabilirsiniz."],
  ["Çocukların gizliliği", "FootBattle çocuklardan bilerek gereksiz kişisel veri toplamayı amaçlamaz. Bir ebeveyn veya yasal temsilci, bir çocuğa ait kişisel verilerin uygunsuz şekilde işlendiğini düşünüyorsa bizimle iletişime geçebilir."],
];

const enSections = [
  ["Data we process", "FootBattle may process account information such as an email address and, when provided by the user, a phone number during account creation and sign-in. When profile features are used, a username, display name and profile image URL may be stored. During gameplay, we may process game type, scores, game duration, session identifiers, page/feature usage, duel and ranked-match information, and technical identifiers used for security and abuse prevention. If notifications are enabled, a device push notification token may be stored."],
  ["Why we use data", "We use this data to provide account and profile functionality, save gameplay progress and scores, operate friends, duels and ranking features, send notifications, measure service usage, troubleshoot problems, and detect cheating, abuse or security issues."],
  ["Service providers", "FootBattle may use Supabase for authentication and data storage, Vercel for application hosting and usage analytics, and Firebase/Google services for authentication and notification functionality in the Android application. These providers may process data under their own service terms and privacy obligations."],
  ["Cookies and local storage", "The web and Android WebView experiences may use cookies and browser/device local storage technologies to maintain sessions, support authentication and provide core application functionality."],
  ["Sharing and sale of data", "We do not sell your personal data. Data may be processed by service providers only as necessary to provide and secure FootBattle and perform the functions described above, or disclosed to competent authorities when legally required."],
  ["Retention and security", "We aim to retain data only for as long as necessary to provide the service, maintain security, resolve disputes and comply with legal obligations. We apply reasonable technical and organizational safeguards against unauthorized access, alteration or disclosure."],
  ["Your rights and account deletion", "Depending on applicable law, you may have rights to access, correct or request deletion of your personal data. You may contact us through the channel below for account or personal-data deletion requests."],
  ["Children's privacy", "FootBattle does not intend to knowingly collect unnecessary personal information from children. A parent or legal guardian who believes a child's personal data has been processed inappropriately may contact us."],
];

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "tr" && locale !== "en") notFound();
  const tr = locale === "tr";
  const sections = tr ? trSections : enSections;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <article className="space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{tr ? "FootBattle Gizlilik Politikası" : "FootBattle Privacy Policy"}</h1>
          <p className="text-sm opacity-70">{tr ? `Son güncelleme: ${UPDATED}` : "Last updated: August 24, 2026"}</p>
          <p className="leading-7 opacity-90">
            {tr
              ? "Bu Gizlilik Politikası, FootBattle web sitesi ve Android uygulaması kullanıldığında hangi bilgilerin işlendiğini ve bunların nasıl kullanıldığını açıklar."
              : "This Privacy Policy explains what information is processed when you use the FootBattle website and Android application and how that information is used."}
          </p>
        </header>

        {sections.map(([title, body]) => (
          <section key={title} className="space-y-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="leading-7 opacity-90">{body}</p>
          </section>
        ))}

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">{tr ? "İletişim" : "Contact"}</h2>
          <p className="leading-7 opacity-90">
            {tr
              ? "Gizlilik, kişisel veriler veya hesap silme konularındaki talepleriniz için FootBattle'ın resmi iletişim kanallarından bize ulaşabilirsiniz."
              : "For requests concerning privacy, personal data or account deletion, please contact us through FootBattle's official contact channels."}
          </p>
        </section>
      </article>
    </main>
  );
}
