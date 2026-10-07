// src/components/admin/advertisements/form/WeeklyScheduleSection.tsx
"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/Button/Button";
import { TextField } from "@/components/ui/TextField/TextField";
import {
  WEEKDAY_SHORT,
  formatWeeklySchedule,
} from "@/lib/ads/weekly-schedule";
import type { AdvertisementFormSchemaData } from "@/lib/schemas";
import { FormSection as Section } from "./FormSection";

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
/** Ordem dos botões: começa na segunda */
const WEEKDAY_BUTTONS = [1, 2, 3, 4, 5, 6, 0];

/** Dias da semana e faixa de horário em que o anúncio pode passar. */
export function WeeklyScheduleSection() {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<AdvertisementFormSchemaData>();
  const [weekdays, dailyStart, dailyEnd] = watch([
    "weekdays",
    "daily_start",
    "daily_end",
  ]);
  const weeklySummary = formatWeeklySchedule({
    weekdays,
    daily_start: dailyStart,
    daily_end: dailyEnd,
  });

  return (
    <Section title="Dias e horários">
      <Controller
        control={control}
        name="weekdays"
        render={({ field }) => {
          const selected = field.value ?? ALL_WEEKDAYS;
          const toggle = (day: number) =>
            field.onChange(
              selected.includes(day)
                ? selected.filter((d) => d !== day)
                : [...selected, day]
            );
          return (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">
                Dias da semana
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_BUTTONS.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    size="sm"
                    variant={selected.includes(day) ? "primary" : "secondary"}
                    aria-pressed={selected.includes(day)}
                    onClick={() => toggle(day)}
                    className="min-w-12"
                  >
                    {WEEKDAY_SHORT[day]}
                  </Button>
                ))}
              </div>
              {errors.weekdays?.message && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.weekdays.message}
                </p>
              )}
            </fieldset>
          );
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="daily_start"
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              type="time"
              label="Das"
              optional
              error={errors.daily_start?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="daily_end"
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              type="time"
              label="Até"
              optional
              error={errors.daily_end?.message}
            />
          )}
        />
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        {weeklySummary
          ? `Exibe só em: ${weeklySummary} (horário de Brasília).`
          : "Exibe todos os dias, o dia inteiro. Deixe os horários em branco para não limitar."}
      </p>
    </Section>
  );
}
