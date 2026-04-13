import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.nba.com" },
      { protocol: "https", hostname: "avatars.yandex.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "vttlbeewxbwkikmxdlev.supabase.co" },
    ],
  },
};

export default nextConfig;
