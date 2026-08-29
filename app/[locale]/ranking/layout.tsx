import type { ReactNode } from "react";

import { NO_INDEX_METADATA } from "@/lib/seo";

export const metadata = NO_INDEX_METADATA;

export default function RankingLayout({ children }: { children: ReactNode }) {
  return children;
}
