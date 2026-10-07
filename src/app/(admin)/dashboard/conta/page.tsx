// src/app/(admin)/dashboard/conta/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountClient } from "@/components/admin/account/AccountClient";
import { getPageAuthContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ "nova-senha"?: string }>;
}) {
  const ctx = await getPageAuthContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;

  return (
    <AccountClient
      email={ctx.user.email ?? ""}
      fullName={ctx.fullName ?? ""}
      resettingPassword={params["nova-senha"] === "1"}
    />
  );
}
