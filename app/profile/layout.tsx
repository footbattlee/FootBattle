import type { Metadata } from "next";
import type { ReactNode } from "react";

import ProfileRankCard from "@/components/ProfileRankCard";
import { NO_INDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NO_INDEX_METADATA;

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ProfileRankCard />
      {children}
    </>
  );
}
