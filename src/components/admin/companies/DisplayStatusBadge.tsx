// src/components/admin/companies/DisplayStatusBadge.tsx
import { MonitorOff, MonitorPlay, MonitorX } from "lucide-react";
import { Badge } from "@/components/ui/Badge/Badge";
import { formatSince, getDisplayStatus } from "@/lib/display-status";

export function DisplayStatusBadge({
  lastSeenAt,
  now,
}: {
  lastSeenAt: string | null | undefined;
  now: number;
}) {
  const status = getDisplayStatus(lastSeenAt, now);

  if (status === "online") {
    return (
      <Badge tone="success">
        <MonitorPlay size={12} /> No ar
      </Badge>
    );
  }
  if (status === "offline") {
    return (
      <Badge tone="warning">
        <MonitorX size={12} /> Sem sinal {formatSince(lastSeenAt!, now)}
      </Badge>
    );
  }
  return (
    <Badge>
      <MonitorOff size={12} /> Nunca abriu
    </Badge>
  );
}
