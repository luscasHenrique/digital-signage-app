// src/app/(public)/login/page.tsx
import { LoginForm } from "@/components/auth/LoginForm";
import styles from "@/components/auth/auth.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className={styles.page}>
      <LoginForm message={message} />
    </main>
  );
}
