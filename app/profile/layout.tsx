import type { ReactNode } from "react";
import ProfileRankCard from "@/components/ProfileRankCard";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ProfileRankCard />
      {children}
    </>
  );
}
