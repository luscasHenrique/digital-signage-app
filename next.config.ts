import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "pbwpybwviymcxvdmqplv.supabase.co";

const nextConfig: NextConfig = {
  images: {
    // Só hosts confiáveis passam pelo otimizador de imagens.
    // Links externos de anúncios são renderizados com `unoptimized` (ver isOptimizableImage).
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
};

export default nextConfig;
