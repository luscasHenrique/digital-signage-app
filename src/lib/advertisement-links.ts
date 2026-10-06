// src/lib/advertisement-links.ts

/** Calcula quais vínculos anúncio↔empresa precisam ser criados e removidos. */
export function diffCompanyLinks(
  currentIds: string[],
  desiredIds: string[]
): { toAdd: string[]; toRemove: string[] } {
  const current = new Set(currentIds);
  const desired = new Set(desiredIds);

  return {
    toAdd: [...desired].filter((id) => !current.has(id)),
    toRemove: [...current].filter((id) => !desired.has(id)),
  };
}
