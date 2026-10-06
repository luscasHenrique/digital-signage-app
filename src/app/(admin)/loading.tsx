// src/app/(admin)/loading.tsx
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

// Esqueleto com o mesmo formato das páginas do painel (título + conteúdo)
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={220} height={28} />
        <Skeleton variant="text" width={320} />
      </div>
      <Skeleton height={56} radius="var(--lg-radius-lg)" />
      <Skeleton height={360} radius="var(--lg-radius-xl)" />
    </div>
  );
}
