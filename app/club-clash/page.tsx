import type { Metadata } from "next";

import ClubClashPage from "../api/club-clash/page";
import ClubClashCompletionTracker from "@/components/analytics/ClubClashCompletionTracker";
import ClubClashResultFocus from "@/components/mobile/ClubClashResultFocus";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <div data-game="club-clash">
      <ClubClashCompletionTracker />
      <ClubClashResultFocus />
      <ClubClashPage />
    </div>
  );
}
