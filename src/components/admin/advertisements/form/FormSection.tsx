// src/components/admin/advertisements/form/FormSection.tsx
import type { ReactNode } from "react";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <h3 className="text-[length:var(--lg-text-md)]">{title}</h3>
      {children}
    </section>
  );
}
