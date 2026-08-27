"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RangeKey = "today" | "7d" | "30d" | "all";
type Row = { gameName:string; loggedInUnique:number; anonymousUnique:number; totalUniqueKnown:number; anonymousUntrackedStarts:number; starts:number };
type Data = { ok?:boolean; error?:string; trackingSince?:string; summary?:{loggedInUnique:number;anonymousUnique:number;totalUniqueKnown:number;anonymousUntrackedStarts:number;starts:number}; games?:Row[] };

const labels:Record<string,string>={wordle:"Wordle",guess_the_player:"Guess the Player",super_lig_guess_the_player:"Süper Lig Guess the Player",player_quiz:"Player Quiz",transfer_quiz:"Transferi Bil",tic_tac_toe:"Futbol Tic Tac Toe",club_nation:"1 Takım 1 Millet",club_clash:"2 Takım 1 Oyuncu",career_path:"Career Path"};
const ranges:Array<{key:RangeKey;label:string}>=[{key:"today",label:"Bugün"},{key:"7d",label:"Son 7 Gün"},{key:"30d",label:"Son 30 Gün"},{key:"all",label:"Tümü"}];
const nf=new Intl.NumberFormat("tr-TR");

export default function VisitorAnalyticsPage(){
  const [range,setRange]=useState<RangeKey>("7d"); const [data,setData]=useState<Data|null>(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{setLoading(true);fetch(`/api/admin/analytics/visitors?range=${range}`,{cache:"no-store"}).then(r=>r.json()).then(setData).finally(()=>setLoading(false))},[range]);
  const s=data?.summary;
  return <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white"><div className="mx-auto max-w-6xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">FootBattle Admin</p><h1 className="mt-2 text-3xl font-black">Oyuncu / Ziyaretçi Analizi</h1><p className="mt-2 text-sm text-slate-400">Giriş yapan hesaplar user_id, giriş yapmayanlar cihaz/tarayıcı bazlı anonim visitor_id ile sayılır.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/analytics" className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black">← Oyun Raporları</Link>{ranges.map(x=><button key={x.key} onClick={()=>setRange(x.key)} className={`rounded-xl px-3 py-2 text-xs font-black ${range===x.key?"bg-green-500 text-[#07111f]":"border border-white/10 text-slate-400"}`}>{x.label}</button>)}</div></div>
    <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-xs leading-5 text-yellow-100/80">Anonim tekil takibi yeni visitor_id sistemi devreye alındıktan sonra güvenilir. Eski anonim başlangıçlar “Takipsiz anonim başlatma” olarak ayrıca gösterilir. Çerez/localStorage temizlenirse aynı kişi yeni anonim ziyaretçi olarak sayılabilir.</div>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
      ["Giriş Yapan Tekil",s?.loggedInUnique??0,"👤"],["Giriş Yapmayan Tekil",s?.anonymousUnique??0,"🕶️"],["Toplam Bilinen Tekil",s?.totalUniqueKnown??0,"🎯"],["Toplam Başlatma",s?.starts??0,"🎮"],["Takipsiz Anonim Başlatma",s?.anonymousUntrackedStarts??0,"❔"]
    ].map(([l,v,i])=><div key={String(l)} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex justify-between"><p className="text-[10px] font-black uppercase text-slate-500">{l}</p><span>{i}</span></div><p className="mt-3 text-2xl font-black">{loading?"...":nf.format(Number(v))}</p></div>)}</section>
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="text-xs text-slate-500"><th className="p-4">Oyun</th><th>Giriş Yapan Tekil</th><th>Giriş Yapmayan Tekil</th><th>Toplam Bilinen Tekil</th><th>Başlatma</th><th>Takipsiz Anonim Başlatma</th></tr></thead><tbody>{(data?.games??[]).map(r=><tr key={r.gameName} className="border-t border-white/5"><td className="p-4 font-black">{labels[r.gameName]??r.gameName}</td><td>{nf.format(r.loggedInUnique)}</td><td className="text-cyan-300 font-black">{nf.format(r.anonymousUnique)}</td><td>{nf.format(r.totalUniqueKnown)}</td><td>{nf.format(r.starts)}</td><td className="text-yellow-300">{nf.format(r.anonymousUntrackedStarts)}</td></tr>)}</tbody></table></div></section>
    {data?.error&&<p className="mt-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{data.error}</p>}
  </div></main>;
}
