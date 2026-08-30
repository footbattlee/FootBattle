"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RangeKey = "today" | "7d" | "30d" | "all";
type Selection = { name:string; votes:number; finalWins:number; appearances:number; selectionRate:number };
type ResponseData = { ok?:boolean; error?:string; summary?:{completedBrackets:number;totalVotes:number;uniqueSelections:number}; selections?:Selection[]; stageVotes?:Array<{stage:string;count:number}> };
const RANGE_OPTIONS:Array<{key:RangeKey;label:string}>=[{key:"today",label:"Bugün"},{key:"7d",label:"Son 7 Gün"},{key:"30d",label:"Son 30 Gün"},{key:"all",label:"Tümü"}];
function n(v:number){return new Intl.NumberFormat("tr-TR").format(v)}
function pct(v:number){return `%${new Intl.NumberFormat("tr-TR",{maximumFractionDigits:1}).format(v)}`}

export default function SurvivorAnalyticsPage(){
  const [range,setRange]=useState<RangeKey>("today");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [summary,setSummary]=useState({completedBrackets:0,totalVotes:0,uniqueSelections:0});
  const [selections,setSelections]=useState<Selection[]>([]);
  const [stageVotes,setStageVotes]=useState<Array<{stage:string;count:number}>>([]);

  useEffect(()=>{void load()},[range]);
  async function load(){
    try{
      setLoading(true);setError("");
      const r=await fetch(`/api/admin/analytics/survivor?range=${encodeURIComponent(range)}`,{cache:"no-store"});
      const x=await r.json() as ResponseData;
      if(!r.ok||!x.ok)throw new Error(x.error??"Survivor analitiği yüklenemedi.");
      setSummary(x.summary??{completedBrackets:0,totalVotes:0,uniqueSelections:0});
      setSelections(x.selections??[]);setStageVotes(x.stageVotes??[]);
    }catch(e){setError(e instanceof Error?e.message:"Survivor analitiği yüklenemedi.")}finally{setLoading(false)}
  }

  return <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.22em] text-green-400">FootBattle Admin</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Survivor Oyları</h1><p className="mt-2 text-sm text-slate-400">Seçilen tarih aralığında tamamlanan Survivor bracket'larındaki her eşleşme seçimini oy olarak gösterir.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/analytics" className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5 text-xs font-black text-slate-300">← Oyun Özeti</Link>{RANGE_OPTIONS.map(o=><button key={o.key} onClick={()=>setRange(o.key)} className={`rounded-xl px-4 py-2.5 text-xs font-black ${range===o.key?"bg-green-500 text-[#07111f]":"border border-white/10 bg-white/[.03] text-slate-400"}`}>{o.label}</button>)}</div></header>
    {error&&<div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>}
    <section className="mt-6 grid gap-4 sm:grid-cols-3"><Card label="Tamamlanan Survivor" value={n(summary.completedBrackets)} loading={loading}/><Card label="Toplam Oy" value={n(summary.totalVotes)} loading={loading}/><Card label="Oy Alan Seçenek" value={n(summary.uniqueSelections)} loading={loading}/></section>
    <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h2 className="font-black">En Çok Seçilenler</h2><p className="mt-1 text-xs text-slate-500">Oy = bir eşleşmede kazanan olarak seçilme. Seçilme oranı = karşısına çıktığı eşleşmeler içinde kazanma oranı.</p></div><button onClick={()=>void load()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black">Yenile</button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="text-xs text-slate-500"><th className="p-4">#</th><th>Oyuncu / Seçenek</th><th>Oy</th><th>Eşleşme</th><th>Seçilme Oranı</th><th>Şampiyonluk</th></tr></thead><tbody>{selections.map((s,i)=><tr key={`${s.name}-${i}`} className="border-t border-white/5"><td className="p-4 text-slate-500">{i+1}</td><td className="font-black">{s.name}</td><td className="font-black text-green-300">{n(s.votes)}</td><td>{n(s.appearances)}</td><td>{pct(s.selectionRate)}</td><td>{n(s.finalWins)}</td></tr>)}</tbody></table>{!loading&&!selections.length&&<div className="p-8 text-center text-sm text-slate-500">Bu tarih aralığında Survivor oyu yok.</div>}</div></section>
    {!!stageVotes.length&&<section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stageVotes.map(s=><Card key={s.stage} label={s.stage} value={n(s.count)} loading={loading}/>)}</section>}
  </div></main>
}
function Card({label,value,loading}:{label:string;value:string;loading:boolean}){return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-3 text-3xl font-black">{loading?"...":value}</p></div>}
