import { defineConfig } from "@playwright/test";
import { LOCAL_SUPABASE_ENV } from "./e2e/local-env";

// Testes de ponta a ponta contra o Supabase LOCAL (dados de supabase/seed.sql).
// Antes: `npx supabase start` e `npx supabase db reset` (recria os dados).
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Usa o Chrome instalado (sem baixar navegador); no CI: PW_CHANNEL=chromium
    channel: process.env.PW_CHANNEL ?? "chrome",
    viewport: { width: 1366, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: LOCAL_SUPABASE_ENV,
  },
});
