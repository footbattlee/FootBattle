import ClubClashPage from "../api/club-clash/page";
import ClubClashCompletionTracker from "@/components/analytics/ClubClashCompletionTracker";

export default function Page() {
  return (
    <div data-game="club-clash">
      <ClubClashCompletionTracker />
      <ClubClashPage />
    </div>
  );
}
