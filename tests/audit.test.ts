import { describe, expect, it } from "vitest";
import { parsePageParam, sanitizeAuditSearchTerm } from "@/types/audit";

describe("sanitizeAuditSearchTerm (S9)", () => {
  it("remove caracteres que alteram o filtro .or() do PostgREST", () => {
    expect(sanitizeAuditSearchTerm("x%,user_id.not.is.null")).toBe(
      "x user_id.not.is.null"
    );
    expect(sanitizeAuditSearchTerm(`a"b(c)d\\e*f:g'h`)).toBe(
      "a b c d e f g h"
    );
  });

  it("mantém termos comuns e trata vazio", () => {
    expect(sanitizeAuditSearchTerm("  joao@empresa.com ")).toBe(
      "joao@empresa.com"
    );
    expect(sanitizeAuditSearchTerm(undefined)).toBe("");
    expect(sanitizeAuditSearchTerm("x".repeat(500))).toHaveLength(100);
  });
});

describe("parsePageParam", () => {
  it("usa fallback para valores inválidos e respeita limites", () => {
    expect(parsePageParam(undefined, 20, 5, 100)).toBe(20);
    expect(parsePageParam("abc", 20, 5, 100)).toBe(20);
    expect(parsePageParam("1", 20, 5, 100)).toBe(5);
    expect(parsePageParam("1000", 20, 5, 100)).toBe(100);
    expect(parsePageParam("30", 20, 5, 100)).toBe(30);
  });
});
