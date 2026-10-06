"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cx } from "../_internal/cx";
import { AlertCircleIcon, CheckCircleIcon, CloseIcon, InfoIcon, WarningIcon } from "../_internal/icons";
import { Portal } from "../_internal/Portal";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Toast.module.css";

export type ToastTone = "neutral" | "info" | "success" | "warning" | "danger" | "loading";

export type ToastOptions = {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** ms até fechar. 0 = não fecha sozinho. Padrão: 4000 (loading: 0) */
  duration?: number;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
};

type ToastItem = Required<Pick<ToastOptions, "id" | "tone" | "duration">> & ToastOptions & { leaving?: boolean };

export type ToastPosition = "top-center" | "top-right" | "bottom-center" | "bottom-right";

type ToastApi = {
  (options: ToastOptions | string): string;
  success: (title: ReactNode, options?: Partial<ToastOptions>) => string;
  error: (title: ReactNode, options?: Partial<ToastOptions>) => string;
  warning: (title: ReactNode, options?: Partial<ToastOptions>) => string;
  info: (title: ReactNode, options?: Partial<ToastOptions>) => string;
  loading: (title: ReactNode, options?: Partial<ToastOptions>) => string;
  /** Atualiza um toast existente (ex.: loading → success) */
  update: (id: string, options: Partial<ToastOptions>) => void;
  dismiss: (id?: string) => void;
  /** loading → success/erro automaticamente */
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: ReactNode; success: ReactNode | ((value: T) => ReactNode); error: ReactNode | ((err: unknown) => ReactNode) },
  ) => Promise<T>;
};

const ToastContext = createContext<ToastApi | null>(null);

const icons: Record<ToastTone, ReactNode> = {
  neutral: null,
  info: <InfoIcon size={18} />,
  success: <CheckCircleIcon size={18} />,
  warning: <WarningIcon size={18} />,
  danger: <AlertCircleIcon size={18} />,
  loading: <Spinner size={16} />,
};

let seed = 0;

export type ToastProviderProps = {
  children: ReactNode;
  position?: ToastPosition;
  /** Máximo de toasts visíveis */
  max?: number;
};

/** Coloque uma vez no layout raiz. Depois use `const toast = useToast()`. */
export function ToastProvider({ children, position = "bottom-right", max = 4 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 260);
  }, []);

  const api = useMemo<ToastApi>(() => {
    const show = (input: ToastOptions | string) => {
      const options = typeof input === "string" ? { title: input } : input;
      const id = options.id ?? `toast-${++seed}`;
      const tone = options.tone ?? "neutral";
      const item: ToastItem = { ...options, id, tone, duration: options.duration ?? (tone === "loading" ? 0 : 4000) };
      setToasts((list) => {
        const exists = list.some((t) => t.id === id);
        const next = exists ? list.map((t) => (t.id === id ? item : t)) : [...list, item];
        return next.slice(-max);
      });
      return id;
    };
    const withTone = (tone: ToastTone) => (title: ReactNode, options?: Partial<ToastOptions>) =>
      show({ ...options, title, tone });

    const update: ToastApi["update"] = (id, options) =>
      setToasts((list) =>
        list.map((t) =>
          t.id === id
            ? {
                ...t,
                ...options,
                duration: options.duration ?? (options.tone && options.tone !== "loading" ? 4000 : t.duration),
              }
            : t,
        ),
      );
    const loading = withTone("loading");

    const fn: ToastApi = Object.assign(show, {
      success: withTone("success"),
      error: withTone("danger"),
      warning: withTone("warning"),
      info: withTone("info"),
      loading,
      update,
      dismiss: (id?: string) => {
        if (id) remove(id);
        else {
          setToasts((list) => list.map((t) => ({ ...t, leaving: true })));
          setTimeout(() => setToasts((list) => list.filter((t) => !t.leaving)), 260);
        }
      },
      promise: async <T,>(
        promise: Promise<T>,
        messages: {
          loading: ReactNode;
          success: ReactNode | ((value: T) => ReactNode);
          error: ReactNode | ((err: unknown) => ReactNode);
        },
      ): Promise<T> => {
        const id = loading(messages.loading);
        try {
          const value = await promise;
          update(id, {
            tone: "success",
            title: typeof messages.success === "function" ? messages.success(value) : messages.success,
          });
          return value;
        } catch (err) {
          update(id, {
            tone: "danger",
            title: typeof messages.error === "function" ? messages.error(err) : messages.error,
          });
          throw err;
        }
      },
    });
    return fn;
  }, [max, remove]);

  const isTop = position.startsWith("top");

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Portal>
        <ol className={styles.viewport} data-position={position} aria-live="polite" aria-label="Notificações">
          {(isTop ? [...toasts].reverse() : toasts).map((t) => (
            <ToastCard key={t.id} toast={t} onClose={() => {
              t.onDismiss?.();
              remove(t.id);
            }} fromTop={isTop} />
          ))}
        </ol>
      </Portal>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose, fromTop }: { toast: ToastItem; onClose: () => void; fromTop: boolean }) {
  const [paused, setPaused] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Reinicia o tempo quando o toast muda (ex.: loading → success)
  useEffect(() => {
    remaining.current = toast.duration;
  }, [toast.duration, toast.tone]);

  useEffect(() => {
    if (!toast.duration || paused || toast.leaving) return;
    startedAt.current = Date.now();
    const timer = setTimeout(() => closeRef.current(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, toast.duration, toast.tone, toast.leaving]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (startX.current === null) return;
    setDragX(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    if (Math.abs(dragX) > 90) onClose();
    else setDragX(0);
  };

  const icon = toast.icon ?? icons[toast.tone];

  return (
    <li
      className={cx(styles.toast, toast.leaving && styles.leaving)}
      data-tone={toast.tone}
      data-from={fromTop ? "top" : "bottom"}
      role={toast.tone === "danger" ? "alert" : "status"}
      style={dragX ? { transform: `translateX(${dragX}px)`, opacity: 1 - Math.min(Math.abs(dragX) / 200, 0.7), transition: "none" } : undefined}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.content}>
        <p className={styles.title}>{toast.title}</p>
        {toast.description && <p className={styles.description}>{toast.description}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.action!.onClick();
            onClose();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar notificação">
        <CloseIcon size={13} />
      </button>
      {toast.duration > 0 && !toast.leaving && (
        <span
          key={`${toast.tone}-${toast.duration}`}
          className={styles.progress}
          style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
        />
      )}
    </li>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return ctx;
}
