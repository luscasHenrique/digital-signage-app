import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbwpybwviymcxvdmqplv.supabase.co",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        // ADICIONE ESTE BLOCO
        protocol: "https",
        hostname: "png.pngtree.com",
      },
    ],
  },
};

export default nextConfig;
