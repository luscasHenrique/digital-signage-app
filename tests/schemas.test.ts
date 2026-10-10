import { describe, expect, it } from "vitest";
import {
  advertisementFormSchema,
  companySchema,
  normalizeWeeklySchedule,
  userFormSchema,
} from "@/lib/schemas";
import {
  AdvertisementStatus,
  AdvertisementType,
  OverlayPosition,
  UserRole,
} from "@/types";

const base = { name: "Empresa X", slug: "empresa-x", transition: "fade", show_clock: true };

describe("companySchema", () => {
  it("exige senha ao criar empresa privada", () => {
    expect(companySchema.safeParse({ ...base, is_private: true }).success).toBe(
      false
    );
    expect(
      companySchema.safeParse({ ...base, is_private: true, password: "1234" })
        .success
    ).toBe(true);
  });

  it("permite senha em branco ao editar (mantém a atual)", () => {
    expect(
      companySchema.safeParse({
        ...base,
        id: "1",
        is_private: true,
        password: "",
      }).success
    ).toBe(true);
  });

  it("valida o formato do slug", () => {
    expect(
      companySchema.safeParse({
        ...base,
        slug: "Com Espaço",
        is_private: false,
      }).success
    ).toBe(false);
  });
});

describe("userFormSchema", () => {
  it("valida e-mail, nome e papel", () => {
    expect(
      userFormSchema.safeParse({
        full_name: "Fulano de Tal",
        email: "fulano@x.com",
        password: "",
        role: UserRole.STANDARD,
      }).success
    ).toBe(true);
    expect(
      userFormSchema.safeParse({
        full_name: "  ",
        email: "invalido",
        role: "SUPERADMIN",
      }).success
    ).toBe(false);
  });
});

describe("advertisementFormSchema", () => {
  const valid = {
    title: "Promoção",
    type: AdvertisementType.IMAGE_LINK,
    content_url: "https://exemplo.com/a.png",
    start_date: new Date(2026, 9, 1),
    end_date: new Date(2026, 9, 31),
    duration_seconds: "10",
    status: AdvertisementStatus.ACTIVE,
    company_ids: ["c1"],
    overlay_position: OverlayPosition.BOTTOM,
  };

  const errorsOf = (data: object) => {
    const result = advertisementFormSchema.safeParse(data);
    return result.success ? {} : result.error.flatten().fieldErrors;
  };

  it("aceita um anúncio completo", () => {
    expect(advertisementFormSchema.safeParse(valid).success).toBe(true);
  });

  it("exige tipo, datas, empresas e duração mínima", () => {
    const errors = errorsOf({
      ...valid,
      type: undefined,
      start_date: null,
      end_date: null,
      company_ids: [],
      duration_seconds: "3",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "company_ids",
      "duration_seconds",
      "end_date",
      "start_date",
      "type",
    ]);
  });

  it("rejeita data final antes da inicial", () => {
    expect(
      errorsOf({ ...valid, end_date: new Date(2026, 8, 1) }).end_date
    ).toBeDefined();
  });

  it("pede o arquivo para tipos de upload e URL válida para links", () => {
    expect(
      errorsOf({
        ...valid,
        type: AdvertisementType.VIDEO_UPLOAD,
        content_url: "",
      }).content_url
    ).toEqual(["Envie o arquivo do anúncio."]);
    expect(
      errorsOf({ ...valid, content_url: "javascript:alert(1)" }).content_url
    ).toBeDefined();
    expect(
      errorsOf({ ...valid, thumbnail_url: "não é url" }).thumbnail_url
    ).toBeDefined();
  });
});

describe("programação semanal", () => {
  const ad = {
    title: "Promo",
    type: AdvertisementType.IMAGE_LINK,
    content_url: "https://exemplo.com/a.png",
    start_date: new Date("2026-10-01"),
    end_date: new Date("2026-10-31"),
    duration_seconds: "10",
    status: AdvertisementStatus.ACTIVE,
    company_ids: ["c1"],
  };
  const errorsOf = (extra: object) => {
    const r = advertisementFormSchema.safeParse({ ...ad, ...extra });
    return r.success ? {} : r.error.flatten().fieldErrors;
  };

  it("aceita sem restrição e com faixa completa", () => {
    expect(errorsOf({})).toEqual({});
    expect(errorsOf({ weekdays: [1, 2], daily_start: "11:00", daily_end: "14:00" })).toEqual({});
  });

  it("exige ao menos um dia e as duas pontas do horário", () => {
    expect(errorsOf({ weekdays: [] })).toHaveProperty("weekdays");
    expect(errorsOf({ daily_start: "11:00" })).toHaveProperty("daily_end");
    expect(errorsOf({ daily_end: "11:00" })).toHaveProperty("daily_start");
    expect(errorsOf({ daily_start: "11:00", daily_end: "11:00" })).toHaveProperty("daily_end");
    expect(errorsOf({ daily_start: "25:00", daily_end: "11:00" })).toHaveProperty("daily_start");
  });

  it("normaliza para o banco: todos os dias e horários vazios viram null", () => {
    expect(
      normalizeWeeklySchedule({ weekdays: [0, 1, 2, 3, 4, 5, 6], daily_start: "", daily_end: "" })
    ).toEqual({ weekdays: null, daily_start: null, daily_end: null });
    expect(normalizeWeeklySchedule({ weekdays: [5, 1, 5] })).toEqual({
      weekdays: [1, 5],
      daily_start: null,
      daily_end: null,
    });
  });
});
