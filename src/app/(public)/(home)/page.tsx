// src/app/(public)/(home)/page.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-6xl">
          Sua Plataforma de Digital Signage
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
          Gerencie e exiba seus anúncios de forma centralizada e eficiente.
          Controle o conteúdo de suas telas em tempo real, de qualquer lugar.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild>
            <Link href="/login">Acessar Painel</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="#">Saiba Mais &rarr;</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
