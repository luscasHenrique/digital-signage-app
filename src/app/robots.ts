import type { MetadataRoute } from "next";

// Painel e telas são de uso interno: nada para buscadores indexarem
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
