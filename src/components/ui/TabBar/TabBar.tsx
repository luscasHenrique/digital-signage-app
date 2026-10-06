"use client";

import { useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Badge, formatCount } from "../Badge/Badge";
import { cx } from "../_internal/cx";
import { useFocusTrap, useScrollLock } from "../_internal/focus";
import { useControllableState, useEscapeKey, usePresence } from "../_internal/hooks";
import { CloseIcon, MonitorIcon, MoonIcon, SunIcon } from "../_internal/icons";
import { Portal } from "../_internal/Portal";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import type { SidebarLinkProps } from "../Sidebar/Sidebar";
import { useTheme } from "../Theme/ThemeProvider";
import styles from "./TabBar.module.css";

export type TabBarItem = {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  /** Número (vira contador) ou qualquer conteúdo */
  badge?: number | ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

export type TabBarAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: "default" | "danger";
  onSelect: () => void;
};

export type TabBarProps = {
  /** Abas da barra (recomendado: até 4, mais o "Mais") */
  items: TabBarItem[];
  activeId?: string;
  onItemSelect?: (item: TabBarItem) => void;

  /** Itens do sheet "Mais". Se informado, a última aba abre o sheet. */
  moreItems?: TabBarItem[];
  moreLabel?: string;
  moreIcon?: ReactNode;
  /** Título do sheet. Padrão: moreLabel */
  moreTitle?: string;
  /** Conteúdo livre no sheet, abaixo da grade */
  moreContent?: ReactNode;
  /** Linha "Aparência" com Claro / Escuro / Auto */
  showThemeSwitcher?: boolean;
  themeLabel?: string;
  /** Ações em lista no fim do sheet (ex.: Sair) */
  moreActions?: TabBarAction[];

  /** Estado do sheet "Mais" */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** "fixed" flutua no rodapé da tela (padrão); "static" fica no fluxo */
  position?: "fixed" | "static";
  /** Integração com roteadores (ex.: next/link). Padrão: <a>. */
  renderLink?: (props: SidebarLinkProps) => ReactNode;
  ariaLabel?: string;
  closeLabel?: string;
  className?: string;
};

const defaultLink = ({ href, className, children, onClick, ...rest }: SidebarLinkProps) => (
  <a href={href} className={className} onClick={onClick} {...rest}>
    {children}
  </a>
);

/** Ícone de três pontos do "Mais" */
const DotsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

function BadgeDot({ badge }: { badge: TabBarItem["badge"] }) {
  if (badge === undefined || badge === null || badge === false) return null;
  return (
    <span className={styles.badge}>
      {typeof badge === "number" ? (
        <Badge tone="danger" variant="solid">
          {formatCount(badge)}
        </Badge>
      ) : (
        badge
      )}
    </span>
  );
}

function ThemeRow({ label }: { label: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <SegmentedControl
        size="sm"
        ariaLabel={label}
        value={theme}
        onValueChange={(v) => setTheme(v as typeof theme)}
        items={[
          { value: "light", icon: <SunIcon />, label: "Claro" },
          { value: "dark", icon: <MoonIcon />, label: "Escuro" },
          { value: "system", icon: <MonitorIcon />, label: "Auto" },
        ]}
      />
    </div>
  );
}

/**
 * Navegação de app para celular: barra de abas de vidro flutuante com
 * indicador deslizante e um sheet "Mais" (grade de atalhos, aparência e
 * ações) que se fecha arrastando para baixo.
 */
export function TabBar({
  items,
  activeId,
  onItemSelect,
  moreItems,
  moreLabel = "Mais",
  moreIcon,
  moreTitle,
  moreContent,
  showThemeSwitcher = false,
  themeLabel = "Aparência",
  moreActions,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  position = "fixed",
  renderLink = defaultLink,
  ariaLabel = "Navegação",
  closeLabel = "Fechar",
  className,
}: TabBarProps) {
  const id = useId();
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(open, 420);
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef({ y: 0, t: 0 });

  useScrollLock(mounted);
  useFocusTrap(sheetRef, open);
  useEscapeKey(() => setOpen(false), open);

  const hasMore = Boolean(moreItems?.length);
  const activeInMore = moreItems?.some((i) => i.id === activeId) ?? false;
  const count = items.length + (hasMore ? 1 : 0);
  const itemIndex = items.findIndex((i) => i.id === activeId);
  const activeIndex = hasMore && (open || activeInMore) ? items.length : itemIndex;

  const select = (item: TabBarItem, fromSheet = false) => {
    if (item.disabled) return;
    item.onClick?.();
    onItemSelect?.(item);
    if (fromSheet) setOpen(false);
  };

  /* ---------- Arrastar para fechar ---------- */
  const onDragStart = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { y: e.clientY, t: performance.now() };
    setDrag(0);
  };
  const onDragMove = (e: PointerEvent<HTMLElement>) => {
    if (drag === null) return;
    const delta = e.clientY - dragStart.current.y;
    // Para cima resiste (elástico); para baixo acompanha o dedo
    setDrag(delta < 0 ? delta / 5 : delta);
  };
  const onDragEnd = () => {
    if (drag === null) return;
    const velocity = drag / Math.max(performance.now() - dragStart.current.t, 1);
    const height = sheetRef.current?.offsetHeight ?? 400;
    if (drag > Math.min(120, height * 0.3) || velocity > 0.6) setOpen(false);
    setDrag(null);
  };
  const dragHandlers = {
    onPointerDown: onDragStart,
    onPointerMove: onDragMove,
    onPointerUp: onDragEnd,
    onPointerCancel: onDragEnd,
  };

  const renderTab = (item: TabBarItem) => {
    const isActive = item.id === activeId;
    const inner = (
      <>
        <span className={styles.tabIcon}>
          {item.icon}
          <BadgeDot badge={item.badge} />
        </span>
        <span className={styles.tabLabel}>{item.label}</span>
      </>
    );
    if (item.href)
      return (
        <span key={item.id} className={styles.slot}>
          {renderLink({
            href: item.href,
            className: styles.tab,
            children: inner,
            onClick: () => select(item),
            "aria-current": isActive ? "page" : undefined,
            "aria-disabled": item.disabled || undefined,
            "data-active": isActive,
          })}
        </span>
      );
    return (
      <span key={item.id} className={styles.slot}>
        <button
          type="button"
          className={styles.tab}
          data-active={isActive}
          aria-current={isActive ? "page" : undefined}
          disabled={item.disabled}
          onClick={() => select(item)}
        >
          {inner}
        </button>
      </span>
    );
  };

  const renderTile = (item: TabBarItem) => {
    const isActive = item.id === activeId;
    const inner = (
      <>
        <span className={styles.tileIcon}>
          {item.icon}
          <BadgeDot badge={item.badge} />
        </span>
        <span className={styles.tileLabel}>{item.label}</span>
      </>
    );
    return (
      <li key={item.id} className={styles.tileItem}>
        {item.href ? (
          renderLink({
            href: item.href,
            className: styles.tile,
            children: inner,
            onClick: () => select(item, true),
            "aria-current": isActive ? "page" : undefined,
            "aria-disabled": item.disabled || undefined,
            "data-active": isActive,
          })
        ) : (
          <button
            type="button"
            className={styles.tile}
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
            disabled={item.disabled}
            onClick={() => select(item, true)}
          >
            {inner}
          </button>
        )}
      </li>
    );
  };

  const hasGroup = showThemeSwitcher || Boolean(moreActions?.length);

  return (
    <>
      <nav
        className={cx(styles.bar, className)}
        data-position={position}
        aria-label={ariaLabel}
        style={{ "--count": count, "--index": Math.max(activeIndex, 0) } as CSSProperties}
      >
        <span className={styles.indicator} data-hidden={activeIndex < 0} aria-hidden="true" />
        {items.map((item) => renderTab(item))}
        {hasMore && (
          <span className={styles.slot}>
            <button
              type="button"
              className={styles.tab}
              data-active={open || activeInMore}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={id}
              onClick={() => setOpen(!open)}
            >
              <span className={styles.tabIcon}>{moreIcon ?? <DotsIcon />}</span>
              <span className={styles.tabLabel}>{moreLabel}</span>
            </button>
          </span>
        )}
      </nav>

      {mounted && (
        <Portal>
          <div className={styles.root} data-visible={visible}>
            <div className={styles.overlay} aria-hidden="true" onClick={() => setOpen(false)} />
            <div
              ref={sheetRef}
              id={id}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-title`}
              tabIndex={-1}
              className={styles.sheet}
              data-dragging={drag !== null}
              style={drag ? ({ "--drag": `${drag}px` } as CSSProperties) : undefined}
            >
              <div className={styles.handle} {...dragHandlers}>
                <span className={styles.grabber} aria-hidden="true" />
              </div>
              <header className={styles.sheetHeader} {...dragHandlers}>
                <h2 id={`${id}-title`} className={styles.sheetTitle}>
                  {moreTitle ?? moreLabel}
                </h2>
                <button
                  type="button"
                  className={styles.close}
                  onClick={() => setOpen(false)}
                  aria-label={closeLabel}
                  data-skip-autofocus
                >
                  <CloseIcon size={15} />
                </button>
              </header>

              <div className={styles.sheetBody}>
                <ul role="list" className={styles.grid}>
                  {moreItems?.map((item) => renderTile(item))}
                </ul>

                {moreContent}

                {hasGroup && (
                  <div className={styles.group}>
                    {showThemeSwitcher && <ThemeRow label={themeLabel} />}
                    {moreActions?.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className={styles.action}
                        data-tone={action.tone ?? "default"}
                        onClick={() => {
                          action.onSelect();
                          setOpen(false);
                        }}
                      >
                        {action.icon && <span className={styles.actionIcon}>{action.icon}</span>}
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
