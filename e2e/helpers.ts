import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Senha-local-123";

/** Entra no painel com um usuário do seed. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  // Espera a hidratação: digitar antes dela perde o valor dos campos
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  // A primeira compilação do /dashboard no modo dev pode demorar
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}
