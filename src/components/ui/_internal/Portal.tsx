"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PortalThemeScope } from "../Theme/ThemeScope";

const subscribe = () => () => {};

/**
 * Renderiza no <body>. Necessário porque backdrop-filter cria containing block para position: fixed.
 * Preserva o tema de um <ThemeScope> ancestral (o Portal sai da árvore DOM dele).
 */
export function Portal({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!isClient) return null;
  return createPortal(<PortalThemeScope>{children}</PortalThemeScope>, document.body);
}
