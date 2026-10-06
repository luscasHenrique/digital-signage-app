// src/app/(public)/(home)/page.tsx
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";
import { ThemeToggle } from "@/components/ui/Theme/ThemeToggle";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="flex max-w-3xl flex-col items-center">
        <h1 className="font-display text-[length:var(--lg-text-display)] font-extrabold leading-[1.05]">
          Sua plataforma de Digital Signage
        </h1>
        <p className="mt-6 max-w-xl text-[length:var(--lg-text-lg)] text-muted-foreground">
          Gerencie e exiba seus anúncios de forma centralizada. Controle o
          conteúdo das suas telas em tempo real, de qualquer lugar.
        </p>
        <div className="mt-10 flex items-center gap-3">
          <ButtonLink href="/login" size="lg" rightIcon={<ArrowRight />}>
            Acessar painel
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
