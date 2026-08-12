import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // All remote images are tiny, pre-sized Data Dragon icons served from
    // Riot's global CDN. Running them through Vercel's image optimizer adds
    // latency and burns the Image Optimization quota for zero visual gain,
    // so we serve the original URLs directly. next/image still provides
    // lazy-loading and layout stability.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ddragon.leagueoflegends.com",
      },
    ],
  },
};

export default nextConfig;
