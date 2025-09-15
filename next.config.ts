import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbwpybwviymcxvdmqplv.supabase.co", // seu hostname do supabase
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com", // NOVO: Hostname para thumbnails do YouTube
      },
    ],
  },
};

export default nextConfig;
