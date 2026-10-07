// src/lib/ads/weekly-schedule.ts
// Programação semanal dos anúncios: dias da semana e faixa de horário.
// As regras valem no horário de Brasília, independente do fuso da TV/servidor.
import { AdvertisementStatus } from "@/types";

export const SCHEDULE_TIME_ZONE = "America/Sao_Paulo";

/** 0 = domingo ... 6 = sábado (mesma convenção de Date.getDay). */
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type WeeklySchedule = {
  weekdays?: number[] | null;
  /** "HH:MM" ou "HH:MM:SS" (coluna time do Postgres) */
  daily_start?: string | null;
  daily_end?: string | null;
};

const weekdayIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Dia da semana e minutos desde a meia-noite no fuso da programação. */
export function zonedClock(now: Date, timeZone = SCHEDULE_TIME_ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return {
    weekday: weekdayIndex[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** "08:30" / "08:30:00" → 510. */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** "08:30:00" → "08:30" (o input type="time" usa HH:MM). */
export function toHHMM(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

export function hasWeeklyRestriction(s: WeeklySchedule): boolean {
  return (
    (!!s.weekdays && s.weekdays.length > 0 && s.weekdays.length < 7) ||
    (!!s.daily_start && !!s.daily_end)
  );
}

/**
 * O anúncio pode passar agora pelos dias/horários configurados?
 * Faixa com início depois do fim atravessa a meia-noite (ex.: 22:00–02:00):
 * a parte da madrugada conta como o dia em que a faixa começou.
 */
export function isWithinWeeklySchedule(
  s: WeeklySchedule,
  now: Date,
  timeZone = SCHEDULE_TIME_ZONE
): boolean {
  const { weekday, minutes } = zonedClock(now, timeZone);
  const days = s.weekdays && s.weekdays.length > 0 ? s.weekdays : null;
  const dayAllowed = (d: number) => !days || days.includes(d);

  if (!s.daily_start || !s.daily_end) return dayAllowed(weekday);

  const start = timeToMinutes(s.daily_start);
  const end = timeToMinutes(s.daily_end);

  if (start < end) {
    return dayAllowed(weekday) && minutes >= start && minutes < end;
  }
  // Atravessa a meia-noite
  if (minutes >= start) return dayAllowed(weekday);
  if (minutes < end) return dayAllowed((weekday + 6) % 7);
  return false;
}

/** Pode aparecer na tela agora: ativo, dentro do período e da programação semanal. */
export function isPlayableNow(
  ad: WeeklySchedule & {
    status?: AdvertisementStatus | string;
    start_date: string;
    end_date: string;
  },
  now: Date = new Date()
): boolean {
  if (ad.status && ad.status !== AdvertisementStatus.ACTIVE) return false;
  if (new Date(ad.start_date) > now || new Date(ad.end_date) < now) {
    return false;
  }
  return isWithinWeeklySchedule(ad, now);
}

/** Texto curto: "Seg–Sex · 11:00–14:00", "Sáb, Dom", "Todo dia · 18:00–22:00". */
export function formatWeeklySchedule(s: WeeklySchedule): string | null {
  if (!hasWeeklyRestriction(s)) return null;

  const days =
    s.weekdays && s.weekdays.length > 0 && s.weekdays.length < 7
      ? formatWeekdays(s.weekdays)
      : "Todo dia";
  const hours =
    s.daily_start && s.daily_end
      ? `${toHHMM(s.daily_start)}–${toHHMM(s.daily_end)}`
      : null;
  return hours ? `${days} · ${hours}` : days;
}

function formatWeekdays(weekdays: number[]): string {
  // Ordem de leitura começando na segunda
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sorted = order.filter((d) => weekdays.includes(d));
  const positions = sorted.map((d) => order.indexOf(d));
  const contiguous =
    sorted.length >= 3 &&
    positions.every((p, i) => i === 0 || p === positions[i - 1] + 1);
  if (contiguous) {
    return `${WEEKDAY_SHORT[sorted[0]]}–${WEEKDAY_SHORT[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => WEEKDAY_SHORT[d]).join(", ");
}
