import { describe, expect, it } from "vitest";
import {
  computeChanges,
  formatAuditValue,
  redactSecrets,
  summarizeAudit,
} from "@/lib/audit/format";

describe("audit-format", () => {
  it("resume a ação com a área e o título do registro", () => {
    expect(
      summarizeAudit("UPDATE", "advertisements", null, { title: "Promo" })
    ).toBe("Atualizou anúncio “Promo”");
    expect(summarizeAudit("DELETE", "companies", { name: "Loja" }, null)).toBe(
      "Excluiu empresa “Loja”"
    );
    expect(summarizeAudit("INSERT", "outra_tabela", null, null)).toBe(
      "Criou outra_tabela"
    );
  });

  it("lista só os campos alterados, ignorando os técnicos", () => {
    const changes = computeChanges(
      { title: "A", status: "ACTIVE", updated_at: "1", is_private: false },
      { title: "B", status: "ACTIVE", updated_at: "2", is_private: true }
    );
    expect(changes).toEqual([
      { key: "title", label: "Título", before: "A", after: "B" },
      { key: "is_private", label: "Privada", before: "Não", after: "Sim" },
    ]);
  });

  it("nunca exibe o valor da senha", () => {
    const changes = computeChanges(
      { password: "scrypt$antigo" },
      { password: "scrypt$novo" }
    );
    expect(changes[0].before).toBe("••••••");
    expect(changes[0].after).toBe("••••••");

    const redacted = redactSecrets({ name: "Loja", password: "scrypt$x" });
    expect(redacted).toEqual({ name: "Loja", password: "••••••" });
    expect(JSON.stringify(redacted)).not.toContain("scrypt");
  });

  it("formata valores vazios, booleanos e objetos", () => {
    expect(formatAuditValue("x", null)).toBe("—");
    expect(formatAuditValue("x", "")).toBe("—");
    expect(formatAuditValue("x", true)).toBe("Sim");
    expect(formatAuditValue("x", { a: 1 })).toBe('{"a":1}');
  });
});
