"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref: string;
  ariaLabel?: string;
};

export default function BackButton({ fallbackHref, ariaLabel = "Geri" }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={ariaLabel}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-2xl font-light text-white transition hover:bg-white/[0.08] active:scale-95"
    >
      ‹
    </button>
  );
}
