"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function getFocusable(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("inert") && el.offsetParent !== null,
  );
}

/**
 * Mantém o foco dentro do container enquanto ativo (Tab / Shift+Tab circulam)
 * e devolve o foco ao elemento anterior ao desativar.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, initialFocus?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;

    const raf = requestAnimationFrame(() => {
      if (!root) return;
      const items = getFocusable(root);
      // Prefere [data-autofocus]; ignora elementos marcados com data-skip-autofocus (ex.: botão X)
      const target =
        initialFocus?.current ??
        root.querySelector<HTMLElement>("[data-autofocus]") ??
        items.find((el) => !el.hasAttribute("data-skip-autofocus")) ??
        root;
      target.focus({ preventScroll: true });
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !root) return;
      const items = getFocusable(root);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [active, ref, initialFocus]);
}

let lockCount = 0;
let previousOverflow = "";
let previousPadding = "";

/** Trava a rolagem do body (com contagem, para modais empilhados). */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (lockCount === 0) {
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      previousOverflow = body.style.overflow;
      previousPadding = body.style.paddingRight;
      body.style.overflow = "hidden";
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPadding;
      }
    };
  }, [active]);
}
