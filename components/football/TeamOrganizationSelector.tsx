"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { key: string; label: string; emoji: string };

export default function TeamOrganizationSelector({
  options,
  current,
  tr,
}: {
  options: Option[];
  current: string;
  tr: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function changeOrganization(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("org");
    else params.set("org", value);
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  }

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <label htmlFor="team-organization" className="mb-2 block text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">
        {tr ? "ORGANİZASYON" : "COMPETITION"}
      </label>
      <select
        id="team-organization"
        value={current}
        onChange={(event) => changeOrganization(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0d1828] px-4 py-3 text-sm font-black text-white outline-none"
      >
        <option value="all">🌍 {tr ? "Tümü" : "All competitions"}</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>{option.emoji} {option.label}</option>
        ))}
      </select>
    </section>
  );
}
