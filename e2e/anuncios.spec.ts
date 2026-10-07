import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { LOCAL_SUPABASE_ENV } from "./local-env";

test("lista de anúncios paginada, com busca e filtro no servidor", async ({ page }) => {
  // 30 anúncios só deste teste (o setup global apaga os "E2E ...")
  const admin = createClient(
    LOCAL_SUPABASE_ENV.NEXT_PUBLIC_SUPABASE_URL,
    LOCAL_SUPABASE_ENV.SUPABASE_SERVICE_ROLE_KEY
  );
  const day = 24 * 60 * 60 * 1000;
  const { error } = await admin.from("advertisements").insert(
    Array.from({ length: 30 }, (_, i) => ({
      title: `E2E Página ${String(i + 1).padStart(2, "0")}`,
      type: "IMAGE_LINK",
      content_url: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
      start_date: new Date(Date.now() - day).toISOString(),
      end_date: new Date(Date.now() + day).toISOString(),
      duration_seconds: 5,
      status: i % 2 ? "INACTIVE" : "ACTIVE",
    }))
  );
  expect(error).toBeNull();

  await login(page, "admin@local.test");
  await page.goto("/dashboard/anuncios");
  // 3 do seed + 30 = 33 → 2 páginas de 24
  await expect(page.getByText("Página 1 de 2")).toBeVisible();
  await expect(page.getByText("33 anúncio(s)")).toBeVisible();

  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.getByText("Página 2 de 2")).toBeVisible();

  // Busca pelo título (no servidor) volta para a página 1
  await page.getByLabel("Buscar anúncios").fill("E2E Página 0");
  await expect(page).toHaveURL(/q=E2E/);
  await expect(page.getByText("Página 1 de 2")).toBeHidden();
  await expect(page.getByRole("heading", { name: "E2E Página 09" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "E2E Página 10" })).toBeHidden();

  // Busca pelo nome da empresa vinculada
  await page.getByLabel("Buscar anúncios").fill("Loja Privada");
  await expect(page.getByRole("heading", { name: "Boas-vindas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /E2E/ })).toHaveCount(0);

  // Filtro de situação
  await page.getByLabel("Buscar anúncios").fill("");
  await expect(page).not.toHaveURL(/q=/);
  await page.getByLabel("Filtrar por situação").click();
  await page.getByRole("option", { name: "Inativo" }).click();
  await expect(page).toHaveURL(/situacao=inactive/);
  // 15 inativos do teste + "Desativado" do seed
  await expect(page.getByRole("heading", { name: /E2E Página/ })).toHaveCount(15);

  // O diálogo "Ordem" carrega a lista inteira
  await page.getByRole("button", { name: "Ordem" }).click();
  await expect(page.getByRole("dialog").locator("ol li")).toHaveCount(33);
});
