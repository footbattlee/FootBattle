"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Faceoff = {
  id: string;
  matchDate: string;
  title: string;
  category: string;
  leftName: string;
  rightName: string;
  isActive: boolean;
  votes: { total: number; left: number; right: number };
};

type FormState = {
  id: string;
  matchDate: string;
  title: string;
  category: string;
  leftName: string;
  rightName: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  id: "",
  matchDate: "",
  title: "Günün Kapışması",
  category: "Genel",
  leftName: "",
  rightName: "",
  isActive: true,
};

export default function AdminFaceoffsPage() {
  const [items, setItems] = useState<Faceoff[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/faceoffs", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Kapışmalar yüklenemedi.");
      setItems(result.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kapışmalar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const editing = Boolean(form.id);
  const totalVotes = useMemo(() => items.reduce((sum, item) => sum + item.votes.total, 0), [items]);

  function edit(item: Faceoff) {
    setForm({
      id: item.id,
      matchDate: item.matchDate,
      title: item.title,
      category: item.category,
      leftName: item.leftName,
      rightName: item.rightName,
      isActive: item.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.matchDate || !form.leftName.trim() || !form.rightName.trim()) {
      setMessage("Tarih ve iki oyuncu zorunlu.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/faceoffs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Kayıt yapılamadı.");
      setMessage(editing ? "Kapışma güncellendi ✓" : "Kapışma oluşturuldu ✓");
      setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıt yapılamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: Faceoff) {
    const response = await fetch("/api/admin/faceoffs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setMessage(result.error ?? "Durum güncellenemedi.");
      return;
    }
    await load();
  }

  async function remove(item: Faceoff) {
    if (!window.confirm(`${item.matchDate} tarihli ${item.leftName} - ${item.rightName} kapışması silinsin mi? Oylar da silinir.`)) return;
    const response = await fetch("/api/admin/faceoffs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setMessage(result.error ?? "Kapışma silinemedi.");
      return;
    }
    if (form.id === item.id) setForm(EMPTY_FORM);
    await load();
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">← Admin Panel</Link>
              <Link href="/gunun-kapismasi" className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300">🔥 Canlı Sayfayı Aç</Link>
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-orange-300">Topluluk İçeriği</p>
            <h1 className="mt-2 text-4xl font-black">Günün Kapışması Yönetimi</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Tarih bazlı eşleşmeleri oluştur, düzenle, aktif/pasif yap ve oy sayılarını takip et.</p>
          </div>
          <div className="flex gap-3">
            <Stat value={String(items.length)} label="Kapışma" />
            <Stat value={String(totalVotes)} label="Toplam Oy" />
          </div>
        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-green-300">{editing ? "Düzenle" : "Yeni Kayıt"}</p>
              <h2 className="mt-1 text-2xl font-black">{editing ? "Kapışmayı Güncelle" : "Yeni Günün Kapışması"}</h2>
            </div>
            {editing && <button type="button" onClick={() => setForm(EMPTY_FORM)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">Vazgeç</button>}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Tarih"><input type="date" value={form.matchDate} onChange={(e) => setForm({ ...form, matchDate: e.target.value })} className="input" /></Field>
            <Field label="Kategori"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="GOAT, Süper Lig..." className="input" /></Field>
            <Field label="Başlık"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
            <Field label="Sol Oyuncu"><input value={form.leftName} onChange={(e) => setForm({ ...form, leftName: e.target.value })} placeholder="Lionel Messi" className="input" /></Field>
            <Field label="Sağ Oyuncu"><input value={form.rightName} onChange={(e) => setForm({ ...form, rightName: e.target.value })} placeholder="Cristiano Ronaldo" className="input" /></Field>
            <label className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-white/10 bg-[#07111f] px-4">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-5 w-5" />
              <span><span className="block text-sm font-black">Aktif</span><span className="text-xs text-slate-500">Kapışma o gün yayında olsun.</span></span>
            </label>
          </div>

          <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 min-h-12 rounded-xl bg-green-500 px-6 font-black text-[#07111f] disabled:opacity-50">{saving ? "Kaydediliyor..." : editing ? "Değişiklikleri Kaydet" : "Kapışmayı Oluştur"}</button>
          {message && <p className="mt-3 text-sm font-bold text-yellow-200">{message}</p>}
        </section>

        <section className="mt-7">
          <h2 className="text-2xl font-black">Planlanan Kapışmalar</h2>
          {loading ? (
            <p className="mt-4 text-slate-500">Yükleniyor...</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {items.map((item) => {
                const leftPct = item.votes.total > 0 ? Math.round((item.votes.left / item.votes.total) * 100) : 0;
                const rightPct = item.votes.total > 0 ? 100 - leftPct : 0;
                return (
                  <article key={item.id} className="rounded-3xl border border-white/10 bg-[#0d1828] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-slate-400">{item.matchDate}</span>
                          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-black text-slate-300">{item.category}</span>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${item.isActive ? "bg-green-400/10 text-green-300" : "bg-red-400/10 text-red-300"}`}>{item.isActive ? "AKTİF" : "PASİF"}</span>
                        </div>
                        <h3 className="mt-3 text-xl font-black">{item.leftName} <span className="text-orange-300">VS</span> {item.rightName}</h3>
                        <p className="mt-1 text-sm text-slate-500">{item.title}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-400"><span>🗳️ {item.votes.total} oy</span><span>{item.leftName}: %{leftPct}</span><span>{item.rightName}: %{rightPct}</span></div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => edit(item)} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-200">Düzenle</button>
                        <button type="button" onClick={() => void toggle(item)} className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-200">{item.isActive ? "Pasife Al" : "Aktifleştir"}</button>
                        <button type="button" onClick={() => void remove(item)} className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-black text-red-200">Sil</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <style jsx global>{`.input{width:100%;min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#07111f;padding:0 14px;color:white;outline:none}.input:focus{border-color:rgba(74,222,128,.45)}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="min-w-[110px] rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"><p className="text-2xl font-black text-green-300">{value}</p><p className="text-[10px] font-black uppercase tracking-wider text-slate-600">{label}</p></div>;
}
