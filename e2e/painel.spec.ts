import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { login } from "./helpers";
import { LOCAL_SUPABASE_ENV } from "./local-env";

test.describe("painel", () => {
  test("admin vê o dashboard e as áreas de administração", async ({ page }) => {
    await login(page, "admin@local.test");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/dashboard/admin/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
    await page.goto("/dashboard/admin/auditoria");
    await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
  });

  test("usuário comum não acessa administração", async ({ page }) => {
    await login(page, "standard@local.test");
    await page.goto("/dashboard/admin/usuarios");
    await expect(page.getByText("Página não encontrada")).toBeVisible();
  });

  test("desativar em lote tira o anúncio do ar", async ({ page }) => {
    // Anúncio só deste teste (o setup global apaga os "E2E ...")
    const admin = createClient(
      LOCAL_SUPABASE_ENV.NEXT_PUBLIC_SUPABASE_URL,
      LOCAL_SUPABASE_ENV.SUPABASE_SERVICE_ROLE_KEY
    );
    const day = 24 * 60 * 60 * 1000;
    const { error } = await admin.from("advertisements").insert({
      title: "E2E Lote",
      type: "IMAGE_LINK",
      content_url: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
      start_date: new Date(Date.now() - day).toISOString(),
      end_date: new Date(Date.now() + day).toISOString(),
      duration_seconds: 5,
      status: "ACTIVE",
    });
    expect(error).toBeNull();

    await login(page, "admin@local.test");
    await page.goto("/dashboard/anuncios");
    await page.getByRole("radio", { name: "Tabela" }).click();

    const row = page.getByRole("row", { name: /E2E Lote/ });
    await row.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Desativar", exact: true }).click();
    await expect(row.getByText("Inativo")).toBeVisible();

    await row.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Ativar", exact: true }).click();
    await expect(row.getByText("No ar")).toBeVisible();
  });
});
