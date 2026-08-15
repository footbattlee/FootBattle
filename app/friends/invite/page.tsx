"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string | null;
  display_name: string | null;
};

export default function FriendInvitePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled) setProfile((data ?? null) as Profile | null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const inviteUrl = useMemo(() => {
    if (!profile?.username || typeof window === "undefined") return "";
    return `${window.location.origin}/u/${encodeURIComponent(profile.username)}?invite=1`;
  }, [profile?.username]);

  const message = useMemo(() => {
    if (!inviteUrl) return "";
    const name = profile?.display_name || profile?.username || "FootBattle oyuncusu";
    return `⚽ ${name} seni FootBattle'a çağırıyor!\n\nArkadaş ol, skorlarımızı karşılaştıralım ve düello yapalım:\n${inviteUrl}`;
  }, [inviteUrl, profile?.display_name, profile?.username]);

  async function copyInvite() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareInvite() {
    if (!message) return;
    if (navigator.share) {
      await navigator.share({ title: "FootBattle arkadaş daveti", text: message });
      return;
    }
    await copyInvite();
  }

  return (
    <main className="min-h-[100dvh] bg-[#07111f] text-white">
      <div className="mx-auto max-w-xl px-4 py-8 sm:py-14">
        <div className="flex items-center justify-between">
          <Link href="/profile" className="text-sm font-black text-slate-400 hover:text-white">← Profil</Link>
          <Link href="/" className="text-sm font-black text-green-300">FootBattle</Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-green-400/20 bg-gradient-to-br from-green-400/[0.10] via-white/[0.035] to-purple-400/[0.06] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">Arkadaş Daveti</p>
          <h1 className="mt-3 text-3xl font-black">Ekibini FootBattle'a getir.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Linki gönder. Arkadaşın profilini açıp seni eklesin; sonra arkadaş sıralamasında ve düellolarda kapışın.</p>

          {loading ? (
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm font-bold text-slate-500">Davet hazırlanıyor...</div>
          ) : !profile?.username ? (
            <div className="mt-7 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-5">
              <p className="font-black text-amber-200">Önce kullanıcı adı belirlemelisin.</p>
              <p className="mt-1 text-sm text-slate-400">Davet linkin profil kullanıcı adına bağlı.</p>
              <Link href="/profile" className="mt-4 inline-flex rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-[#07111f]">Profile Dön</Link>
            </div>
          ) : (
            <>
              <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Davet Linkin</p>
                <p className="mt-2 break-all text-sm font-bold text-green-200">{inviteUrl}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => void shareInvite()} className="min-h-12 rounded-xl bg-green-500 px-4 text-sm font-black text-[#07111f] hover:bg-green-400">📲 Paylaş</button>
                <button type="button" onClick={() => void copyInvite()} className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white hover:bg-white/[0.08]">{copied ? "✓ Kopyalandı" : "🔗 Linki Kopyala"}</button>
              </div>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-green-400/20 bg-green-400/[0.08] px-4 text-sm font-black text-green-200"
              >
                WhatsApp'ta Gönder
              </a>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
