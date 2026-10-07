import type { MetadataRoute } from "next";

// Permite "instalar" o app na TV/tablet: abre em tela cheia, sem barra do navegador
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Digital Signage",
    short_name: "Signage",
    description: "Gerenciador de conteúdo para Digital Signage",
    start_url: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#000000",
    theme_color: "#06070b",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
