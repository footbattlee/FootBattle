"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SurvivorItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "player" | "team";
  isActive: boolean;
  completions: number;
  entries: Array<{ id: string; slot: number; name: string; imageUrl: string | null; sourcePlayerId: number | null }>;
};

type FormState = {
  id: string;
  title: string;
  description: string;
  kind: "player" | "team";
  isActive: boolean;
  entries: string[];
};

function emptyForm(): FormState {
  return { id: "", title: "", description: "", kind: "player", isActive: true, entries: Array.from({ length: 16 }, () => "") };
}

export default function AdminSurvivorsPage() {
  const [items, setItems] = useState<SurvivorItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/survivors", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Survivor listesi yüklenemedi.");
      setItems(result.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Survivor listesi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const editing = Boolean(form.id);
  const totalCompletions = useMemo(() => items.reduce((sum, item) => sum + item.completions, 0), [items]);
  const filled = form.entries.filter((entry) => entry.trim()).length;

  function updateEntry(index: number, value: string) {
    setForm((current) => ({ ...current, entries: current.entries.map((entry, entryIndex) => entryIndex === index ? value : entry) }));
  }

  function edit(item: SurvivorItem) {
    const entries = Array.from({ length: 16 }, (_, index) => item.entries.find((entry) => entry.slot === index + 1)?.name ?? "");
    setForm({ id: item.id, title: item.title, description: item.description, kind: item.kind, isActive: item.isActive, entries });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/survivors", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Kayıt yapılamadı.");
      setMessage(editing ? "Survivor güncellendi ✓" : "Survivor oluşturuldu ✓");
      setForm(emptyForm());
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıt yapılamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: SurvivorItem) {
    const response = await fetch("/api/admin/survivors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, title: item.title, description: item.description, kind: item.kind, isActive: !item.isActive, entries: item.entries.sort((a, b) => a.slot - b.slot).map((entry) => entry.name) }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) setMessage(result.error ?? "Durum değiştirilemedi.");
    else await load();
  }

  async function remove(item: SurvivorItem) {
    if (!window.confirm(`“${item.title}” silinsin mi? Tamamlanmış sonuç kayıtları da silinir.`)) return;
    const response = await fetch("/api/admin/survivors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) setMessage(result.error ?? "Survivor silinemedi.");
    else {
      if (form.id === item.id) setForm(emptyForm());
      await load();
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">← Admin Panel</Link>
              <Link href="/survivor" className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-sm font-bold text-yellow-200">👑 Canlı Survivor</Link>
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Turnuva Yönetimi</p>
            <h1 className="mt-2 text-4xl font-black">Survivor Yönetimi</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Oyun adını ve 16 katılımcıyı gir. İlk eşleşmeler oyun başında rastgele kurulur; bracket başladıktan sonra sabit kalır.</p>
          </div>
          <div className="flex gap-3"><Stat value={String(items.length)} label="Survivor" /><Stat value={String(totalCompletions)} label="Tamamlama" /></div>
        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-green-300">{editing ? "Düzenle" : "Yeni Oyun"}</p>
              <h2 className="mt-1 text-2xl font-black">{editing ? "Survivor'ı Güncelle" : "Yeni Survivor Oluştur"}</h2>
            </div>
            {editing && <button type="button" onClick={() => setForm(emptyForm())} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">Vazgeç</button>}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Oyun Adı"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Süper Lig Efsaneleri" className="input" /></Field>
            <Field label="Tür"><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "player" | "team" })} className="input"><option value="player">Futbolcu</option><option value="team">Takım</option></select></Field>
            <div className="md:col-span-2"><Field label="Açıklama"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="16 efsane, tek şampiyon." className="input" /></Field></div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div><p className="text-sm font-black">16 Katılımcı</p><p className="mt-1 text-xs text-slate-500">{form.kind === "player" ? "İsim mevcut oyuncu veritabanıyla eşleşirse fotoğraf otomatik bağlanır." : "Takım türünde ilk sürüm isim kartı kullanır."}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${filled === 16 ? "bg-green-400/10 text-green-300" : "bg-white/[0.05] text-slate-400"}`}>{filled}/16</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {form.entries.map((entry, index) => (
              <label key={index} className="rounded-2xl border border-white/10 bg-[#07111f] p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">#{index + 1}</span>
                <input value={entry} onChange={(e) => updateEntry(index, e.target.value)} placeholder={form.kind === "player" ? "Lionel Messi" : "Galatasaray"} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-700" />
              </label>
            ))}
          </div>

          <label className="mt-5 flex items-center gap-3 text-sm font-bold text-slate-300"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-5 w-5" /> Yayında / aktif</label>
          <button type="button" onClick={() => void save()} disabled={saving || filled !== 16 || !form.title.trim()} className="mt-5 min-h-12 rounded-xl bg-green-500 px-6 font-black text-[#07111f] disabled:opacity-40">{saving ? "Kaydediliyor..." : editing ? "Değişiklikleri Kaydet" : "Survivor'ı Oluştur"}</button>
          {message && <p className="mt-3 text-sm font-bold text-yellow-200">{message}</p>}
        </section>

        <section className="mt-7">
          <h2 className="text-2xl font-black">Mevcut Survivor'lar</h2>
          {loading ? <p className="mt-4 text-slate-500">Yükleniyor...</p> : (
            <div className="mt-4 grid gap-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-3xl border border-white/10 bg-[#0d1828] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-black text-slate-300">{item.kind === "player" ? "FUTBOLCU" : "TAKIM"}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${item.isActive ? "bg-green-400/10 text-green-300" : "bg-red-400/10 text-red-300"}`}>{item.isActive ? "AKTİF" : "PASİF"}</span></div>
                      <h3 className="mt-3 text-xl font-black">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">/{item.slug} · ✅ {item.completions} tamamlanma</p>
                      <p className="mt-2 line-clamp-2 text-xs text-slate-600">{item.entries.sort((a, b) => a.slot - b.slot).map((entry) => entry.name).join(" · ")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/survivor/${item.slug}`} className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm font-black text-green-200">Canlı Aç</Link>
                      <button type="button" onClick={() => edit(item)} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-200">Düzenle</button>
                      <button type="button" onClick={() => void toggle(item)} className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-200">{item.isActive ? "Pasife Al" : "Aktifleştir"}</button>
                      <button type="button" onClick={() => void remove(item)} className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-black text-red-200">Sil</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <style jsx global>{`.input{width:100%;min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#07111f;padding:0 14px;color:white;outline:none}.input:focus{border-color:rgba(250,204,21,.45)}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="min-w-[110px] rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"><p className="text-2xl font-black text-green-300">{value}</p><p className="text-[10px] font-black uppercase tracking-wider text-slate-600">{label}</p></div>; }
