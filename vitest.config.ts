import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" lança erro fora do runtime do Next; nos testes é um módulo vazio.
      "server-only": path.resolve(__dirname, "tests/helpers/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      JWT_SECRET_KEY: "test-secret-key-with-enough-length-123456",
      NEXT_PUBLIC_SUPABASE_URL: "https://projeto.supabase.co",
    },
  },
});
