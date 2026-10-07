// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ui/Theme/ThemeProvider";
import { ThemeScript } from "@/components/ui/Theme/ThemeScript";
import { ToastProvider } from "@/components/ui/Toast/Toast";
import { ErrorReporter } from "@/components/ErrorReporter";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "800"],
});
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

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
