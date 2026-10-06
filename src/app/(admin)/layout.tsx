// src/app/(admin)/layout.tsx
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPageAuthContext } from "@/lib/auth";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const ctx = await getPageAuthContext();
  if (!ctx) redirect("/login");

  return (
    <AdminShell
      userRole={ctx.role}
      userName={ctx.fullName || ctx.user.email || "Usuário"}
      userEmail={ctx.user.email ?? ""}
    >
      {children}
    </AdminShell>
  );
}
