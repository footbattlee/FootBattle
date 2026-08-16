"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SurvivorItem = {
  id: string; slug: string; title: string; description: string; titleTr: string; titleEn: string; descriptionTr: string; descriptionEn: string;
  kind: "player" | "team"; isActive: boolean; completions: number;
  entries: Array<{ id: string; slot: number; name: string; imageUrl: string | null; sourcePlayerId: number | null }>;
};
type FormState = { id: string; titleTr: string; titleEn: string; descriptionTr: string; descriptionEn: string; kind: "player" | "team"; isActive: boolean; entries: string[] };
function emptyForm(): FormState { return { id: "", titleTr: "", titleEn: "", descriptionTr: "", descriptionEn: "", kind: "player", isActive: true, entries: Array.from({ length: 16 }, () => "") }; }

export default function AdminSurvivorsPage() {
  const [items, setItems] = useState<SurvivorItem[]>([]); const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const editing = Boolean(form.id); const filled = form.entries.filter((x) => x.trim()).length;
  const totalCompletions = useMemo(() => items.reduce((sum, item) => sum + item.completions, 0), [items]);

  async function load() { setLoading(true); try { const r = await fetch("/api/admin/survivors", { cache: "no-store" }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error ?? "Survivor listesi yüklenemedi."); setItems(j.items ?? []); } catch (e) { setMessage(e instanceof Error ? e.message : "Survivor listesi yüklenemedi."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  function updateEntry(index: number, value: string) { setForm((c) => ({ ...c, entries: c.entries.map((x, i) => i === index ? value : x) })); }
  function edit(item: SurvivorItem) { setForm({ id: item.id, titleTr: item.titleTr, titleEn: item.titleEn, descriptionTr: item.descriptionTr, descriptionEn: item.descriptionEn, kind: item.kind, isActive: item.isActive, entries: Array.from({ length: 16 }, (_, i) => item.entries.find((x) => x.slot === i + 1)?.name ?? "") }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function save() { setSaving(true); setMessage(""); try { const r = await fetch("/api/admin/survivors", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error ?? "Kayıt yapılamadı."); setMessage(editing ? "Survivor güncellendi ✓" : "Survivor oluşturuldu ✓"); setForm(emptyForm()); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Kayıt yapılamadı."); } finally { setSaving(false); } }
  async function toggle(item: SurvivorItem) { const r = await fetch("/api/admin/survivors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, titleTr: item.titleTr, titleEn: item.titleEn, descriptionTr: item.descriptionTr, descriptionEn: item.descriptionEn, kind: item.kind, isActive: !item.isActive, entries: [...item.entries].sort((a,b)=>a.slot-b.slot).map((x)=>x.name) }) }); const j=await r.json(); if(!r.ok||!j.ok)setMessage(j.error??"Durum değiştirilemedi."); else await load(); }
  async function remove(item: SurvivorItem) { if (!window.confirm(`“${item.titleTr}” silinsin mi?`)) return; const r=await fetch("/api/admin/survivors",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id})}); const j=await r.json(); if(!r.ok||!j.ok)setMessage(j.error??"Silinemedi."); else { if(form.id===item.id)setForm(emptyForm()); await load(); } }

  return <main className="min-h-screen bg-[#07111f] text-white"><div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
    <header className="flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex gap-2"><Link href="/admin" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">← Admin Panel</Link><Link href="/tr/survivor" className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-sm font-bold text-yellow-200">👑 Canlı Survivor</Link></div><p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Turnuva Yönetimi</p><h1 className="mt-2 text-4xl font-black">Survivor Yönetimi</h1><p className="mt-3 text-sm text-slate-400">TR metinleri zorunlu, EN metinleri opsiyonel. EN boşsa İngilizce sayfada TR fallback gösterilir.</p></div><div className="flex gap-3"><Stat value={String(items.length)} label="Survivor"/><Stat value={String(totalCompletions)} label="Tamamlama"/></div></header>

    <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">{editing?"Survivor'ı Güncelle":"Yeni Survivor Oluştur"}</h2>{editing&&<button onClick={()=>setForm(emptyForm())} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">Vazgeç</button>}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Oyun Adı (TR) *"><input value={form.titleTr} onChange={(e)=>setForm({...form,titleTr:e.target.value})} placeholder="Süper Lig Efsaneleri" className="input"/></Field>
        <Field label="Game Name (EN)"><input value={form.titleEn} onChange={(e)=>setForm({...form,titleEn:e.target.value})} placeholder="Süper Lig Legends" className="input"/></Field>
        <Field label="Açıklama (TR)"><input value={form.descriptionTr} onChange={(e)=>setForm({...form,descriptionTr:e.target.value})} placeholder="16 efsane, tek şampiyon." className="input"/></Field>
        <Field label="Description (EN)"><input value={form.descriptionEn} onChange={(e)=>setForm({...form,descriptionEn:e.target.value})} placeholder="16 legends. One champion." className="input"/></Field>
        <Field label="Tür"><select value={form.kind} onChange={(e)=>setForm({...form,kind:e.target.value as "player"|"team"})} className="input"><option value="player">Futbolcu</option><option value="team">Takım</option></select></Field>
      </div>
      <div className="mt-6 flex items-center justify-between"><div><p className="text-sm font-black">16 Katılımcı</p><p className="text-xs text-slate-500">Oyuncu/takım adları evrensel kabul edilir; iki kere yazmana gerek yok.</p></div><span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-black">{filled}/16</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{form.entries.map((entry,index)=><label key={index} className="rounded-2xl border border-white/10 bg-[#07111f] p-3"><span className="text-[10px] font-black text-slate-600">#{index+1}</span><input value={entry} onChange={(e)=>updateEntry(index,e.target.value)} placeholder={form.kind==="player"?"Lionel Messi":"Galatasaray"} className="mt-2 w-full bg-transparent text-sm font-bold outline-none"/></label>)}</div>
      <label className="mt-5 flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={(e)=>setForm({...form,isActive:e.target.checked})}/> Yayında / aktif</label>
      <button onClick={()=>void save()} disabled={saving||filled!==16||!form.titleTr.trim()} className="mt-5 min-h-12 rounded-xl bg-green-500 px-6 font-black text-[#07111f] disabled:opacity-40">{saving?"Kaydediliyor...":editing?"Değişiklikleri Kaydet":"Survivor'ı Oluştur"}</button>{message&&<p className="mt-3 text-sm font-bold text-yellow-200">{message}</p>}
    </section>

    <section className="mt-7"><h2 className="text-2xl font-black">Mevcut Survivor'lar</h2>{loading?<p className="mt-4 text-slate-500">Yükleniyor...</p>:<div className="mt-4 grid gap-4">{items.map((item)=><article key={item.id} className="rounded-3xl border border-white/10 bg-[#0d1828] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-xl font-black">🇹🇷 {item.titleTr}</h3><p className="mt-1 text-sm text-green-300">🇬🇧 {item.titleEn||"TR fallback"}</p><p className="mt-2 text-xs text-slate-500">/{item.slug} · ✅ {item.completions}</p></div><div className="flex flex-wrap gap-2"><Link href={`/tr/survivor/${item.slug}`} className="btn">Canlı Aç</Link><button onClick={()=>edit(item)} className="btn">Düzenle</button><button onClick={()=>void toggle(item)} className="btn">{item.isActive?"Pasife Al":"Aktifleştir"}</button><button onClick={()=>void remove(item)} className="btn">Sil</button></div></div></article>)}</div>}</section>
  </div><style jsx global>{`.input{width:100%;min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#07111f;padding:0 14px;color:white;outline:none}.btn{border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 14px;font-size:14px;font-weight:800}`}</style></main>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>}
function Stat({value,label}:{value:string;label:string}){return <div className="min-w-[110px] rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"><p className="text-2xl font-black text-green-300">{value}</p><p className="text-[10px] font-black uppercase text-slate-600">{label}</p></div>}
