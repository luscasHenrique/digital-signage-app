// src/components/admin/advertisements/ColorField.tsx
"use client";

import { useId } from "react";
import { RgbaStringColorPicker } from "react-colorful";
import { Popover } from "@/components/ui/Popover/Popover";
import { TextField } from "@/components/ui/TextField/TextField";

/** Campo de cor RGBA: amostra que abre o seletor + valor editável à mão. */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <Popover
        label={label}
        placement="bottom-start"
        trigger={(props) => (
          <button
            {...props}
            type="button"
            aria-labelledby={labelId}
            className="flex h-[var(--lg-control-md)] w-full items-center gap-2.5 rounded-[var(--lg-radius-md)] border border-[var(--lg-field-border)] bg-[var(--lg-field-bg)] px-2.5 text-left text-sm transition-colors hover:bg-[var(--lg-field-bg-hover)]"
          >
            <span
              className="size-6 shrink-0 rounded-[8px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{ background: value }}
            />
            <span className="truncate font-mono text-xs text-muted-foreground">
              {value}
            </span>
          </button>
        )}
      >
        <div className="flex flex-col gap-3 p-1">
          <RgbaStringColorPicker color={value} onChange={onChange} />
          <TextField
            size="sm"
            aria-label={`${label} (valor)`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </Popover>
    </div>
  );
}
