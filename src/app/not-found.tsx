// src/app/not-found.tsx
import { Home, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";
import { Card } from "@/components/ui/Card/Card";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4">
      <Card
        variant="strong"
        padding="lg"
        className="flex max-w-md flex-col items-center gap-3 text-center"
      >
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-primary">
          <SearchX size={22} />
        </span>
        <h1 className="text-[length:var(--lg-text-xl)]">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground">
          O endereço pode estar errado, ou a tela/página foi removida.
        </p>
        <ButtonLink href="/" variant="secondary" leftIcon={<Home />}>
          Voltar ao início
        </ButtonLink>
      </Card>
    </div>
  );
}
