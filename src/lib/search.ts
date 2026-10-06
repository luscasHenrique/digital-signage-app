// src/lib/search.ts

/** Normaliza texto para busca: minúsculas e sem acentos. */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
