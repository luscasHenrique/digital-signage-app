// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/ui/Theme/ThemeProvider";
import { ThemeScript } from "@/components/ui/Theme/ThemeScript";
import { ToastProvider } from "@/components/ui/Toast/Toast";
import { ErrorReporter } from "@/components/ErrorReporter";
import "./globals.css";

// Fontes servidas pelo próprio app (pacotes @fontsource): o build não
// depende de baixar nada do Google Fonts
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
const display = localFont({
  src: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
  variable: "--font-display",
  weight: "100 900",
  display: "swap",
});
const mono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Digital Signage", template: "%s · Digital Signage" },
  description: "Gerenciador de conteúdo para Digital Signage",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f5" },
    { media: "(prefers-color-scheme: dark)", color: "#06070b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
    >
      <head>
        {/* Aplica o tema salvo antes da primeira pintura (sem flash) */}
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          {/* Fundo ambiente que dá profundidade ao vidro */}
          <div className="lg-ambient" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <ToastProvider>{children}</ToastProvider>
          <ErrorReporter />
        </ThemeProvider>
      </body>
    </html>
  );
}
