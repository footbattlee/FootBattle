"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Referral = {
  code: string;
  clicks: number;
  successfulInvites: number;
  earnedXp: number;
  inviteeBonusXp: number;
  inviterBonusXp: number;
  shareUrl: string;
};

type ReferralResponse = { ok?: boolean; error?: string; referral?: Referral };

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export default function FriendInvitePage() {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/me", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as ReferralResponse;
        if (!response.ok || !result.ok || !result.referral) throw new Error(result.error ?? "Davet linki hazırlanamadı.");
        setReferral(result.referral);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Davet linki hazırlanamadı."))
      .finally(() => setLoading(false));
  }, []);

  const inviteUrl = useMemo(() => {
    if (!referral || typeof window === "undefined") return "";
    return `${window.location.origin}${referral.shareUrl}`;
  }, [referral]);

  const message = useMemo(() => {
    if (!inviteUrl || !referral) return "";
    return `⚽ FootBattle'a gel, futbol bilgimizi kapıştıralım!\n\nDavet linkimden katılırsan +${referral.inviteeBonusXp} XP ile başlıyorsun.\n${inviteUrl}`;
  }, [inviteUrl, referral]);

  async function copyInvite() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareInvite() {
    if (!message) return;
    if (navigator.share) {
      await navigator.share({ title: "FootBattle arkadaş daveti", text: message, url: inviteUrl });
      return;
    }
    await copyInvite();
  }

  return (
    <main className="min-h-[100dvh] bg-[#07111f] text-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
        <div className="flex items-center justify-between">
          <Link href="/friends" className="text-sm font-black text-slate-400 hover:text-white">← Arkadaşlar</Link>
          <Link href="/" className="text-sm font-black text-green-300">FootBattle</Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-green-400/20 bg-gradient-to-br from-green-400/[0.10] via-white/[0.035] to-purple-400/[0.06] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">Arkadaş Daveti</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Ekibini FootBattle'a getir.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Kişisel davet linkini paylaş. Arkadaşın kayıt olup giriş yaptığında sistem daveti otomatik tanır; sen +250 XP, arkadaşın +100 XP kazanır.</p>

          {loading ? (
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm font-bold text-slate-500">Davet hazırlanıyor...</div>
          ) : error ? (
            <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-5">
              <p className="font-black text-red-200">{error}</p>
              <Link href="/login" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#07111f]">Giriş Yap</Link>
            </div>
          ) : referral ? (
            <>
              <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center sm:p-4">
                  <p className="text-2xl font-black">{formatNumber(referral.clicks)}</p>
                  <p className="mt-1 text-[10px] font-black uppercase text-slate-500">Tıklama</p>
                </div>
                <div className="rounded-2xl border border-green-400/15 bg-green-400/[0.06] p-3 text-center sm:p-4">
                  <p className="text-2xl font-black text-green-300">{formatNumber(referral.successfulInvites)}</p>
                  <p className="mt-1 text-[10px] font-black uppercase text-slate-500">Katılan</p>
                </div>
                <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.06] p-3 text-center sm:p-4">
                  <p className="text-2xl font-black text-yellow-200">+{formatNumber(referral.earnedXp)}</p>
                  <p className="mt-1 text-[10px] font-black uppercase text-slate-500">Kazanılan XP</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Davet Kodun</p>
                  <span className="rounded-lg bg-green-400/10 px-2 py-1 text-xs font-black text-green-300">{referral.code}</span>
                </div>
                <p className="mt-3 break-all text-sm font-bold text-green-200">{inviteUrl}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => void shareInvite()} className="min-h-12 rounded-xl bg-green-500 px-4 text-sm font-black text-[#07111f] hover:bg-green-400">📲 Davet Et</button>
                <button type="button" onClick={() => void copyInvite()} className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white hover:bg-white/[0.08]">{copied ? "✓ Kopyalandı" : "🔗 Linki Kopyala"}</button>
              </div>

              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-green-400/20 bg-green-400/[0.08] px-4 text-sm font-black text-green-200">WhatsApp'ta Gönder</a>

              <div className="mt-5 rounded-2xl border border-purple-400/15 bg-purple-400/[0.05] p-4 text-xs leading-5 text-slate-400">
                Bir hesap yalnızca bir davetçiye yazılabilir. Kendi linkinle kendi hesabını davet edemezsin. XP ödülü başarılı kayıt/giriş sonrasında bir kez verilir.
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
