"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FaceoffItem = {
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
  id?: string;
  matchDate: string;
  title: string;
  category: string;
  leftName: string;
  rightName: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  matchDate: new Date().toISOString().slice(0, 10),
  title: "Günün Kapışması",
  category: "Genel",
  leftName: "",
  rightName: "",
  isActive: true,
};

export default function AdminFaceoffsPage() {
  const [items, setItems] = useState<FaceoffItem[]>([]);
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
      if (!response.ok || !result?.ok) throw new Error(result?.error ?? "Kapışmalar yüklenemedi.");
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
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.matchDate.localeCompare(b.matchDate)),
    [items],
  );

  async function save() {
    if (!form.matchDate || !form.leftName.trim() || !form.rightName.trim()) {
      setMessage("Tarih ve iki futbolcu zorunlu.");
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
      if (!response.ok || !result?.ok) throw new Error(result?.error ?? "Kayıt başarısız.");
      setMessage(editing ? "Kapışma güncellendi ✓" : "Kapışma oluşturuldu ✓");
      setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: FaceoffItem) {
    if (!window.confirm(`${item.matchDate} · ${item.leftName} vs ${item.rightName} silinsin mi?`)) return;
    setMessage("");
    try {
      const response = await fetch("/api/admin/faceoffs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const result = await response.json();
      if (!response.ok || !result?.ok) throw new Error(result?.error ?? "Silinemedi.");
      setMessage("Kapışma silindi ✓");
      if (form.id === item.id) setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Silinemedi.");
    }
  }

  async function toggleActive(item: FaceoffItem) {
    setMessage("");
    try {
      const response = await fetch("/api/admin/faceoffs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      const result = await response.json();
      if (!response.ok || !result?.ok) throw new Error(result?.error ?? "Durum değiştirilemedi.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Durum değiştirilemedi.");
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300">← Admin Panel</Link>
          <Link href="/gunun-kapismasi" className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300">🔥 Canlı Sayfa</Link>
        </div>

        <div className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Topluluk</p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">Günün Kapışması Yönetimi</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Tarihe göre kapışma planla, oyuncuları değiştir, aktif/pasif yap ve oy dağılımını takip et.</p>
        </div>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-green-300">{editing ? "Düzenle" : "Yeni Kapışma"}</p>
              <h2 className="mt-1 text-xl font-black">{editing ? `${form.leftName} vs ${form.rightName}` : "Yeni eşleşme oluştur"}</h2>
            </div>
            {editing && (
              <button type="button" onClick={() => setForm(EMPTY_FORM)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300">Yeni Kayıt</button>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Tarih"><input type="date" value={form.matchDate} onChange={(e) => setForm({ ...form, matchDate: e.target.value })} className="input" /></Field>
            <Field label="Başlık"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
            <Field label="Kategori"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="GOAT, Süper Lig, Kaleciler..." className="input" /></Field>
            <Field label="Sol Taraf"><input value={form.leftName} onChange={(e) => setForm({ ...form, leftName: e.target.value })} placeholder="Lionel Messi" className="input" /></Field>
            <Field label="Sağ Taraf"><input value={form.rightName} onChange={(e) => setForm({ ...form, rightName: e.target.value })} placeholder="Cristiano Ronaldo" className="input" /></Field>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#07111f] px-4 text-sm font-bold">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Aktif
            </label>
          </div>

          <button type="button" disabled={saving} onClick={() => void save()} className="mt-5 min-h-12 rounded-xl bg-green-500 px-5 text-sm font-black text-[#07111f] disabled:opacity-50">
            {saving ? "Kaydediliyor..." : editing ? "Değişiklikleri Kaydet" : "Kapışmayı Oluştur"}
          </button>
          {message && <p className="mt-3 text-sm font-bold text-yellow-200">{message}</p>}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Takvim</p>
              <h2 className="mt-1 text-2xl font-black">Planlanan Kapışmalar</h2>
            </div>
            <button type="button" onClick={() => void load()} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300">Yenile</button>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-white/10 p-5 text-sm text-slate-400">Yükleniyor...</div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {sortedItems.map((item) => {
                const total = Math.max(1, item.votes.total);
                const leftPercent = Math.round((item.votes.left / total) * 100);
                const rightPercent = item.votes.total === 0 ? 0 : 100 - leftPercent;
                return (
                  <article key={item.id} className="rounded-2xl border border-white/10 bg-[#0d1828] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-orange-300">{item.matchDate} · {item.category}</p>
                        <h3 className="mt-2 text-xl font-black">{item.leftName} <span className="text-slate-600">vs</span> {item.rightName}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.isActive ? "bg-green-400/10 text-green-300" : "bg-white/5 text-slate-500"}`}>{item.isActive ? "AKTİF" : "PASİF"}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <Stat value={String(item.votes.left)} label={`${leftPercent}% Sol`} />
                      <Stat value={String(item.votes.total)} label="Toplam Oy" />
                      <Stat value={String(item.votes.right)} label={`${rightPercent}% Sağ`} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setForm({ id: item.id, matchDate: item.matchDate, title: item.title, category: item.category, leftName: item.leftName, rightName: item.rightName, isActive: item.isActive })} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-200">Düzenle</button>
                      <button type="button" onClick={() => void toggleActive(item)} className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs font-black text-yellow-200">{item.isActive ? "Pasif Yap" : "Aktif Yap"}</button>
                      <button type="button" onClick={() => void remove(item)} className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-black text-red-200">Sil</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <style jsx global>{`
        .input { width:100%; min-height:48px; border-radius:12px; border:1px solid rgba(255,255,255,.1); background:#07111f; padding:0 14px; color:white; outline:none; }
        .input:focus { border-color:rgba(74,222,128,.45); }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#07111f] p-3"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase text-slate-600">{label}</p></div>;
}
