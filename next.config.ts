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
      {
        // ADICIONE ESTE NOVO BLOCO
        protocol: "https",
        hostname: "encrypted-tbn2.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "*.gstatic.com", // O '*' permite qualquer subdomínio
      },
      {
        protocol: "https",
        hostname: "**", // O '**' permite qualquer domínio
      },
    ],
  },
};

export default nextConfig;
