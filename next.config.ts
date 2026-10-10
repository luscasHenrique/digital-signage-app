import type { NextConfig } from "next";

const supabaseUrl = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://pbwpybwviymcxvdmqplv.supabase.co"
);
const supabaseHost = supabaseUrl.hostname;
// Origem completa (protocolo + porta): no Supabase local é http://127.0.0.1:54321
const supabaseOrigin = supabaseUrl.origin;
const supabaseRealtimeOrigin = supabaseOrigin.replace(/^http/, "ws");

const isDev = process.env.NODE_ENV !== "production";

// Anúncios por link podem apontar para qualquer host https (imagem/vídeo),
// por isso img-src/media-src aceitam https:. Scripts só do próprio site
// ('unsafe-inline' cobre o script de tema e o bootstrap do Next).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https: ${supabaseOrigin}`,
  `media-src 'self' blob: https: ${supabaseOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseRealtimeOrigin}`,
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), fullscreen=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Só hosts confiáveis passam pelo otimizador de imagens.
    // Links externos de anúncios são renderizados com `unoptimized` (ver isOptimizableImage).
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol === "http:" ? "http" : "https",
        hostname: supabaseHost,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
