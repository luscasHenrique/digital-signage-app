// src/components/admin/advertisements/ScheduleBadge.tsx
import { Badge } from "@/components/ui/Badge/Badge";
import {
  AD_SCHEDULE_LABEL,
  getAdSchedule,
  type AdSchedule,
} from "@/lib/ads/advertisement";
import { Advertisement } from "@/types";

const tone: Record<AdSchedule, "success" | "accent" | "neutral" | "warning"> = {
  live: "success",
  offHours: "neutral",
  scheduled: "accent",
  expired: "warning",
  inactive: "neutral",
};

export function ScheduleBadge({
  ad,
  overImage,
}: {
  ad: Pick<
    Advertisement,
    "status" | "start_date" | "end_date" | "weekdays" | "daily_start" | "daily_end"
  >;
  /** Sobre imagens o selo precisa ser sólido para continuar legível */
  overImage?: boolean;
}) {
  const schedule = getAdSchedule(ad);
  return (
    <Badge
      tone={tone[schedule]}
      variant={overImage || schedule === "live" ? "solid" : "soft"}
    >
      {AD_SCHEDULE_LABEL[schedule]}
    </Badge>
  );
}
