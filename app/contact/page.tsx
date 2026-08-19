import type { Metadata } from "next";

import SiteInfoPage from "@/components/SiteInfoPage";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "İletişim",
  description: "FootBattle iletişim ve geri bildirim kanalları.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <SiteInfoPage
      eyebrow="İLETİŞİM"
      title="Bize Ulaş"
      intro="Hata bildirimi, geri bildirim, reklam ve iş birliği talepleri için resmi FootBattle kanallarından bize ulaşabilirsin."
    >
      <section>
        <h2 className="text-xl font-black text-white">E-posta</h2>
        <p className="mt-2">Genel iletişim, hata bildirimi, reklam ve iş birliği talepleri için bize e-posta gönderebilirsin.</p>
        <a
          href="mailto:footbattlee@gmail.com"
          className="mt-3 inline-flex rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-2.5 font-black text-green-200 hover:bg-green-400/15"
        >
          footbattlee@gmail.com →
        </a>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Instagram</h2>
        <p className="mt-2">En hızlı geri bildirim kanallarımızdan biri Instagram hesabımızdır.</p>
        <a
          href="https://www.instagram.com/playfootbattle/"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex rounded-xl border border-pink-400/20 bg-pink-400/10 px-4 py-2.5 font-black text-pink-200 hover:bg-pink-400/15"
        >
          @playfootbattle →
        </a>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Geri bildirim</h2>
        <p className="mt-2">Bir oyun, futbolcu verisi veya arayüzde hata görürsen hangi sayfada olduğunu ve mümkünse ekran görüntüsünü paylaşman çözümü hızlandırır.</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-white">Reklam ve iş birliği</h2>
        <p className="mt-2">Reklam, sponsorluk veya içerik iş birliği taleplerini e-posta veya Instagram üzerinden iletebilirsin.</p>
      </section>
    </SiteInfoPage>
  );
}
