import type { Metadata } from "next";
import AccountDeletionPanel from "@/components/account/AccountDeletionPanel";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hesap Silme | FootBattle",
  description: "FootBattle hesabını ve ilişkili kişisel verileri silme işlemini başlat.",
  alternates: { canonical: `${SITE_URL}/account-deletion` },
};

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <a href="/tr" className="inline-flex"><img src="/footbattle-logo.png" alt="FootBattle" className="h-10 w-auto object-contain" /></a>
        <div className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">FootBattle</p>
          <h1 className="mt-2 text-3xl font-black">Hesap ve veri silme</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Bu sayfa uygulamayı yüklemeden de FootBattle hesabını silme işlemini başlatabilmen için herkese açıktır. Hesabın varsa giriş yapıp aşağıdaki işlemi tamamlayabilirsin.</p>
        </div>
        <div className="mt-6"><AccountDeletionPanel standalone /></div>
        <p className="mt-6 text-xs leading-5 text-slate-500">Silme tamamlandığında tekrar giriş yapamazsın. Yeni bir hesap açmak istersen daha sonra yeniden kayıt olabilirsin.</p>
      </div>
    </main>
  );
}
