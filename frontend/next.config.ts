import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "ia.media-imdb.com" },
    ],
  },
};

export default nextConfig;
