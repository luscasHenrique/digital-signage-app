// src/lib/display-status.ts
// Status das TVs a partir do último contato do player (display_heartbeats).

/** O player consulta a cada 30 s; 2 min sem contato = fora do ar. */
export const ONLINE_THRESHOLD_MS = 2 * 60_000;

export type DisplayStatus = "online" | "offline" | "never";

export function getDisplayStatus(
  lastSeenAt: string | null | undefined,
  now: number = Date.now()
): DisplayStatus {
  if (!lastSeenAt) return "never";
  return now - Date.parse(lastSeenAt) <= ONLINE_THRESHOLD_MS
    ? "online"
    : "offline";
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias". */
export function formatSince(
  iso: string,
  now: number = Date.now()
): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}
