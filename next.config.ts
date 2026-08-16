import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Retire the old Vercel hostname while preserving deep links and query strings.
      {
        source: "/:path*",
        has: [{ type: "host", value: "foot-battle.vercel.app" }],
        destination: "https://playfootbattle.com/:path*",
        permanent: true,
      },

      // Canonical TR routes for core experiences that now have localized URLs.
      { source: "/guess-the-player", destination: "/tr/guess-the-player", permanent: true },
      { source: "/career-path", destination: "/tr/career-path", permanent: true },
      { source: "/wordle", destination: "/tr/wordle", permanent: true },
      { source: "/tic-tac-toe", destination: "/tr/tic-tac-toe", permanent: true },
      { source: "/survivor", destination: "/tr/survivor", permanent: true },
      { source: "/survivor/:slug", destination: "/tr/survivor/:slug", permanent: true },
      { source: "/gunun-kapismasi", destination: "/tr/daily-faceoff", permanent: true },
      { source: "/gunun-kapismasi/:slug", destination: "/tr/daily-faceoff/:slug", permanent: true },
      { source: "/rank", destination: "/tr/rank", permanent: true },
      { source: "/profile", destination: "/tr/profile", permanent: true },
      { source: "/friends", destination: "/tr/friends", permanent: true },
    ];
  },
};

export default nextConfig;
