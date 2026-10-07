// src/app/(public)/recuperar-senha/page.tsx
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function RecuperarSenhaPage() {
  return (
    <main className={styles.page}>
      <div className={styles.stack}>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
