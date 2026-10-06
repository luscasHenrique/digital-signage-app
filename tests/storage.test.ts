import { describe, expect, it } from "vitest";
import {
  extractStoragePathFromPublicUrl,
  isOptimizableImage,
  sanitizeFileName,
  validateUploadFile,
} from "@/lib/storage";

const SUPABASE = "https://projeto.supabase.co";
const MB = 1024 * 1024;

describe("validateUploadFile", () => {
  it("aceita imagens e vídeos permitidos dentro do limite", () => {
    expect(validateUploadFile({ type: "image/png", size: 2 * MB })).toBeNull();
    expect(
      validateUploadFile({ type: "video/mp4", size: 150 * MB })
    ).toBeNull();
  });

  it("rejeita tipos não permitidos e arquivos grandes demais", () => {
    expect(validateUploadFile({ type: "text/html", size: 10 })).toMatch(
      /não permitido/
    );
    expect(validateUploadFile({ type: "image/svg+xml", size: 10 })).toMatch(
      /não permitido/
    );
    expect(validateUploadFile({ type: "image/jpeg", size: 11 * MB })).toMatch(
      /10 MB/
    );
    expect(validateUploadFile({ type: "video/webm", size: 201 * MB })).toMatch(
      /200 MB/
    );
  });
});

describe("sanitizeFileName", () => {
  it("remove acentos, espaços e caracteres de caminho", () => {
    expect(sanitizeFileName("Promoção de Verão.png")).toBe(
      "Promocao_de_Verao.png"
    );
    expect(sanitizeFileName("../../etc/passwd")).toBe("etc_passwd");
    expect(sanitizeFileName("...")).toBe("arquivo");
  });
});

describe("extractStoragePathFromPublicUrl", () => {
  it("extrai o caminho de URLs do próprio bucket", () => {
    expect(
      extractStoragePathFromPublicUrl(
        `${SUPABASE}/storage/v1/object/public/advertisements/user%201/a.png`,
        SUPABASE
      )
    ).toBe("user 1/a.png");
  });

  it("ignora outros hosts, outros buckets e valores inválidos", () => {
    expect(
      extractStoragePathFromPublicUrl(
        "https://outro.com/storage/v1/object/public/advertisements/a.png",
        SUPABASE
      )
    ).toBeNull();
    expect(
      extractStoragePathFromPublicUrl(
        `${SUPABASE}/storage/v1/object/public/outro/a.png`,
        SUPABASE
      )
    ).toBeNull();
    expect(extractStoragePathFromPublicUrl("não é url", SUPABASE)).toBeNull();
    expect(extractStoragePathFromPublicUrl(null, SUPABASE)).toBeNull();
  });
});

describe("isOptimizableImage", () => {
  it("só otimiza hosts liberados no next.config", () => {
    expect(
      isOptimizableImage(
        `${SUPABASE}/storage/v1/object/public/advertisements/a.png`,
        SUPABASE
      )
    ).toBe(true);
    expect(
      isOptimizableImage("https://i.ytimg.com/vi/x/hqdefault.jpg", SUPABASE)
    ).toBe(true);
    expect(isOptimizableImage("https://qualquer-site.com/a.png", SUPABASE)).toBe(
      false
    );
    expect(isOptimizableImage(undefined, SUPABASE)).toBe(false);
  });
});
