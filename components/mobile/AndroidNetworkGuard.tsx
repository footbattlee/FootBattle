"use client";

import { useEffect, useState } from "react";

export default function AndroidNetworkGuard() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#07111f] px-5 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101c2c] p-6 text-center shadow-2xl">
        <div className="text-4xl">📡</div>
        <h2 className="mt-4 text-xl font-black">İnternet bağlantısı yok</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          FootBattle oyunları ve düelloları için internet bağlantısı gerekiyor. Bağlantın geri geldiğinde devam edebilirsin.
        </p>
        <button
          type="button"
          onClick={() => {
            if (navigator.onLine) window.location.reload();
            else setOffline(true);
          }}
          className="mt-5 min-h-12 w-full rounded-xl bg-green-500 px-4 font-black text-[#07111f]"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
