"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Estado que funciona controlado (value + onChange) ou não controlado (defaultValue).
 * Padrão de todos os componentes do design system.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : internal;

  const onChangeRef = useRef(onChange);
  useIsomorphicLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [isControlled],
  );

  return [current, set];
}

/** Fecha algo ao clicar fora dos elementos informados. */
export function useClickOutside(
  refs: Array<RefObject<HTMLElement | null>>,
  handler: () => void,
  enabled = true,
) {
  const handlerRef = useRef(handler);
  useIsomorphicLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: PointerEvent) => {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      handlerRef.current();
    };
    document.addEventListener("pointerdown", listener);
    return () => document.removeEventListener("pointerdown", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

/** Executa o handler ao pressionar Escape. */
export function useEscapeKey(handler: () => void, enabled = true) {
  const handlerRef = useRef(handler);
  useIsomorphicLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") handlerRef.current();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [enabled]);
}

/**
 * Mantém um elemento montado durante a animação de saída.
 * Retorna `mounted` (renderizar?) e `visible` (estado visual "aberto").
 */
export function usePresence(open: boolean, duration = 200) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  // Monta imediatamente ao abrir (ajuste de estado durante o render)
  if (open && !mounted) setMounted(true);
  if (!open && visible) setVisible(false);

  useEffect(() => {
    if (open) {
      // Dois frames: garante que o estado "fechado" foi pintado antes de animar
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    const timer = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [open, duration]);

  return { mounted, visible };
}

export type Placement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "right"
  | "right-start";

type Side = "top" | "bottom" | "left" | "right";

const opposite: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

/**
 * Posiciona um elemento flutuante (tooltip/popover) em relação a uma âncora,
 * com position: fixed, invertendo o lado se não couber na viewport.
 */
export function useFloatingPosition(
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  { open, placement = "bottom", offset = 8 }: { open: boolean; placement?: Placement; offset?: number },
) {
  const [state, setState] = useState<{ top: number; left: number; side: Side }>({
    top: -9999,
    left: -9999,
    side: placement.split("-")[0] as Side,
  });

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const floating = floatingRef.current;
    if (!anchor || !floating) return;

    const a = anchor.getBoundingClientRect();
    // offset* ignora o transform de entrada (scale), dando o tamanho real
    const f = { width: floating.offsetWidth, height: floating.offsetHeight };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    const [rawSide, align] = placement.split("-") as [Side, "start" | "end" | undefined];
    let side = rawSide;

    const fits = (s: Side) => {
      if (s === "top") return a.top - f.height - offset >= margin;
      if (s === "bottom") return a.bottom + f.height + offset <= vh - margin;
      if (s === "left") return a.left - f.width - offset >= margin;
      return a.right + f.width + offset <= vw - margin;
    };
    if (!fits(side) && fits(opposite[side])) side = opposite[side];

    let top = 0;
    let left = 0;

    if (side === "top" || side === "bottom") {
      top = side === "top" ? a.top - f.height - offset : a.bottom + offset;
      if (align === "start") left = a.left;
      else if (align === "end") left = a.right - f.width;
      else left = a.left + a.width / 2 - f.width / 2;
    } else {
      left = side === "left" ? a.left - f.width - offset : a.right + offset;
      if (align === "start") top = a.top;
      else top = a.top + a.height / 2 - f.height / 2;
    }

    left = Math.min(Math.max(left, margin), vw - f.width - margin);
    top = Math.min(Math.max(top, margin), vh - f.height - margin);

    setState({ top, left, side });
  }, [anchorRef, floatingRef, placement, offset]);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const ro = new ResizeObserver(update);
    if (floatingRef.current) ro.observe(floatingRef.current);
    if (anchorRef.current) ro.observe(anchorRef.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro.disconnect();
    };
  }, [open, update]);

  return { ...state, update };
}
