import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbol Tic Tac Toe | Futbolcu Kesişim Oyunu | FootBattle";
const description = "Takım ve ülke kriterlerine uyan futbolcuları bularak 3x3 futbol Tic Tac Toe tahtasını doldur. Tek başına veya düello modunda futbol bilgini test et.";

export const metadata = createGameMetadata({
  path: "/tic-tac-toe",
  title,
  description,
  keywords: ["futbol tic tac toe", "football tic tac toe", "futbolcu kesişim oyunu", "futbol quiz", "football grid game"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Futbol Tic Tac Toe" description={description} path="/tic-tac-toe" /></>;
}
