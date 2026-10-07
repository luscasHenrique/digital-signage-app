import { describe, expect, it } from "vitest";
import {
  formatWeeklySchedule,
  isPlayableNow,
  isWithinWeeklySchedule,
  zonedClock,
} from "@/lib/ads/weekly-schedule";

// Brasília é UTC-3 (sem horário de verão): 15:00Z = 12:00 local
const at = (iso: string) => new Date(iso);

describe("zonedClock", () => {
  it("usa o horário de Brasília, não o do servidor", () => {
    // 02:00Z de quarta = 23:00 de terça em Brasília
    expect(zonedClock(at("2026-10-07T02:00:00Z"))).toEqual({
      weekday: 2,
      minutes: 23 * 60,
    });
  });
});

describe("isWithinWeeklySchedule", () => {
  // 2026-10-07 é uma quarta-feira (3)
  const quartaMeioDia = at("2026-10-07T15:00:00Z");

  it("sem restrição, vale sempre", () => {
    expect(isWithinWeeklySchedule({}, quartaMeioDia)).toBe(true);
  });

  it("filtra pelos dias da semana", () => {
    expect(isWithinWeeklySchedule({ weekdays: [1, 2, 3, 4, 5] }, quartaMeioDia)).toBe(true);
    expect(isWithinWeeklySchedule({ weekdays: [0, 6] }, quartaMeioDia)).toBe(false);
  });

  it("filtra pela faixa de horário (fim exclusivo)", () => {
    const almoco = { daily_start: "11:00:00", daily_end: "14:00:00" };
    expect(isWithinWeeklySchedule(almoco, quartaMeioDia)).toBe(true);
    expect(isWithinWeeklySchedule(almoco, at("2026-10-07T17:00:00Z"))).toBe(false); // 14:00
    expect(isWithinWeeklySchedule(almoco, at("2026-10-07T13:59:00Z"))).toBe(false); // 10:59
  });

  it("faixa que vira a noite conta a madrugada no dia em que começou", () => {
    const noite = { weekdays: [5], daily_start: "22:00", daily_end: "02:00" };
    // sexta 23:00
    expect(isWithinWeeklySchedule(noite, at("2026-10-10T02:00:00Z"))).toBe(true);
    // sábado 01:00 (continuação da sexta)
    expect(isWithinWeeklySchedule(noite, at("2026-10-10T04:00:00Z"))).toBe(true);
    // sábado 23:00 (sábado não está nos dias)
    expect(isWithinWeeklySchedule(noite, at("2026-10-11T02:00:00Z"))).toBe(false);
    // sexta 01:00 (continuação de quinta, que não está nos dias)
    expect(isWithinWeeklySchedule(noite, at("2026-10-09T04:00:00Z"))).toBe(false);
  });
});

describe("isPlayableNow", () => {
  const base = {
    status: "ACTIVE",
    start_date: "2026-10-01T03:00:00Z",
    end_date: "2026-10-31T02:59:59Z",
  };

  it("combina status, período e programação semanal", () => {
    const now = at("2026-10-07T15:00:00Z");
    expect(isPlayableNow(base, now)).toBe(true);
    expect(isPlayableNow({ ...base, status: "INACTIVE" }, now)).toBe(false);
    expect(isPlayableNow({ ...base, weekdays: [0] }, now)).toBe(false);
    expect(isPlayableNow(base, at("2026-11-02T15:00:00Z"))).toBe(false);
  });
});

describe("formatWeeklySchedule", () => {
  it("resume dias e horários", () => {
    expect(formatWeeklySchedule({})).toBeNull();
    expect(formatWeeklySchedule({ weekdays: [0, 1, 2, 3, 4, 5, 6] })).toBeNull();
    expect(
      formatWeeklySchedule({ weekdays: [1, 2, 3, 4, 5], daily_start: "11:00:00", daily_end: "14:00:00" })
    ).toBe("Seg–Sex · 11:00–14:00");
    expect(formatWeeklySchedule({ weekdays: [6, 0] })).toBe("Sáb, Dom");
    expect(formatWeeklySchedule({ daily_start: "18:00", daily_end: "22:00" })).toBe(
      "Todo dia · 18:00–22:00"
    );
  });
});
