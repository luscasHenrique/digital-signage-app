import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("display", () => {
  test("tela pública exibe só os anúncios ativos, na ordem", async ({ request }) => {
    const res = await request.get("/api/display/loja-centro");
    expect(res.ok()).toBe(true);
    const { ads } = await res.json();
    expect(ads.map((ad: { title: string }) => ad.title)).toEqual([
      "Boas-vindas",
      "Promoção",
    ]);

    // Mesma lista: 304 sem corpo
    const again = await request.get("/api/display/loja-centro", {
      headers: { "If-None-Match": res.headers()["etag"] },
    });
    expect(again.status()).toBe(304);
  });

  test("tela privada pede senha e libera com a senha certa", async ({ page }) => {
    await page.goto("/display/loja-privada");
    // Primeira visita compila a página no modo dev
    await expect(page).toHaveURL(/\/display\/loja-privada\/auth$/, {
      timeout: 60_000,
    });
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Senha de acesso").fill("errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Senha incorreta.")).toBeVisible();

    await page.getByLabel("Senha de acesso").fill("1234");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("#fullscreen-display img").first()).toBeVisible();
  });

  test("abrir a tela marca a empresa como 'No ar' no painel", async ({ page, browser }) => {
    const tv = await browser.newPage();
    await tv.goto("/display/loja-centro");
    await expect(tv.locator("#fullscreen-display")).toBeVisible();
    await tv.close();

    await login(page, "admin@local.test");
    await page.goto("/dashboard/empresas");
    const row = page.getByRole("row", { name: /Loja Centro/ });
    await expect(row.getByText("No ar")).toBeVisible();
  });
});
