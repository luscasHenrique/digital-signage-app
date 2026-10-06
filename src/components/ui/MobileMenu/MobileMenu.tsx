"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "../Avatar/Avatar";
import { Badge, formatCount } from "../Badge/Badge";
import { cx } from "../_internal/cx";
import { useFocusTrap, useScrollLock } from "../_internal/focus";
import { useControllableState, useEscapeKey, usePresence } from "../_internal/hooks";
import { ChevronDownIcon, ChevronRightIcon } from "../_internal/icons";
import { Portal } from "../_internal/Portal";
import type { SidebarItem, SidebarLinkProps, SidebarSection, SidebarUser } from "../Sidebar/Sidebar";
import styles from "./MobileMenu.module.css";

export type MobileMenuTriggerProps = {
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-haspopup": "dialog";
  "aria-label": string;
};

export type MobileMenuProps = {
  /** Mesmo formato da Sidebar: o menu mobile e o desktop compartilham os dados */
  sections: SidebarSection[];
  /** Seções fixas no rodapé (ex.: Configurações, Sair) */
  footerSections?: SidebarSection[];
  activeId?: string;
  onItemSelect?: (item: SidebarItem) => void;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Gatilho próprio (render-prop). Padrão: botão hambúrguer animado. */
  trigger?: (props: MobileMenuTriggerProps) => ReactNode;

  brand?: { logo?: ReactNode; title?: ReactNode };
  /** Ações no topo do painel (ex.: <ThemeToggle />) */
  headerActions?: ReactNode;
  user?: SidebarUser;
  onUserClick?: () => void;
  /** Conteúdo livre no fim (ex.: botões de Entrar / Criar conta) */
  footer?: ReactNode;

  /** "full" ocupa a tela (padrão Apple); "left"/"right" abrem como gaveta */
  placement?: "full" | "left" | "right";
  /** Fecha ao escolher um item. Padrão: true */
  closeOnSelect?: boolean;
  /** Integração com roteadores (ex.: next/link). Padrão: <a>. */
  renderLink?: (props: SidebarLinkProps) => ReactNode;

  /** Nome acessível do painel */
  title?: string;
  openLabel?: string;
  closeLabel?: string;
  className?: string;
};

function containsId(item: SidebarItem, id?: string): boolean {
  if (!id) return false;
  return item.children?.some((c) => c.id === id || containsId(c, id)) ?? false;
}

const defaultLink = ({ href, className, children, onClick, ...rest }: SidebarLinkProps) => (
  <a href={href} className={className} onClick={onClick} {...rest}>
    {children}
  </a>
);

/** Ícone hambúrguer → X (as duas barras giram com mola) */
function Bars() {
  return (
    <span className={styles.bars} aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

/**
 * Menu de navegação para telas pequenas: botão hambúrguer que vira X,
 * painel de vidro em tela cheia ou gaveta, itens com entrada escalonada,
 * sub-itens em acordeão, foco preso, Esc e trava de rolagem.
 */
export function MobileMenu({
  sections,
  footerSections,
  activeId,
  onItemSelect,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  brand,
  headerActions,
  user,
  onUserClick,
  footer,
  placement = "full",
  closeOnSelect = true,
  renderLink = defaultLink,
  title = "Menu",
  openLabel = "Abrir menu",
  closeLabel = "Fechar menu",
  className,
}: MobileMenuProps) {
  const id = useId();
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const panelRef = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(open, 420);

  useScrollLock(mounted);
  useFocusTrap(panelRef, open);
  useEscapeKey(() => setOpen(false), open);

  // Grupos abertos: inicia com o grupo que contém o item ativo
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const set = new Set<string>();
    [...sections, ...(footerSections ?? [])].forEach((s) =>
      s.items.forEach((i) => containsId(i, activeId) && set.add(i.id)),
    );
    return set;
  });

  const toggleGroup = (groupId: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

  const triggerProps: MobileMenuTriggerProps = {
    onClick: () => setOpen(!open),
    "aria-expanded": open,
    "aria-controls": id,
    "aria-haspopup": "dialog",
    "aria-label": open ? closeLabel : openLabel,
  };

  // Índice de entrada escalonada (só itens de primeiro nível)
  let order = 0;

  const renderItem = (item: SidebarItem, depth = 0): ReactNode => {
    const hasChildren = Boolean(item.children?.length);
    const isActive = item.id === activeId;
    const childActive = containsId(item, activeId);
    const isOpen = hasChildren && openGroups.has(item.id);
    const badgeNode = typeof item.badge === "number" ? formatCount(item.badge) : item.badge;

    const inner = (
      <>
        {(depth === 0 || item.icon) && <span className={styles.itemIcon}>{item.icon}</span>}
        <span className={styles.itemLabel}>{item.label}</span>
        {badgeNode && (
          <span className={styles.itemBadge}>
            {typeof item.badge === "number" ? (
              <Badge tone="danger" variant="solid">
                {badgeNode}
              </Badge>
            ) : (
              badgeNode
            )}
          </span>
        )}
        {hasChildren && (
          <span className={styles.chevron} data-open={isOpen}>
            <ChevronDownIcon size={17} />
          </span>
        )}
      </>
    );

    const select = () => {
      if (item.disabled) return;
      if (hasChildren) return toggleGroup(item.id);
      item.onClick?.();
      onItemSelect?.(item);
      if (closeOnSelect) setOpen(false);
    };

    const itemClass = cx(styles.item, depth > 0 && styles.subItem);
    const common = { "data-active": isActive, "data-child-active": childActive };

    const element =
      item.href && !hasChildren ? (
        renderLink({
          href: item.href,
          className: itemClass,
          children: inner,
          onClick: select,
          "aria-current": isActive ? "page" : undefined,
          "aria-disabled": item.disabled || undefined,
          ...common,
        })
      ) : (
        <button
          type="button"
          className={itemClass}
          onClick={select}
          disabled={item.disabled}
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-current={isActive ? "page" : undefined}
          {...common}
        >
          {inner}
        </button>
      );

    return (
      <li
        key={item.id}
        className={cx(styles.li, depth === 0 && styles.stagger)}
        style={depth === 0 ? ({ "--i": order++ } as CSSProperties) : undefined}
      >
        {element}
        {hasChildren && (
          <div className={styles.sub} data-open={isOpen}>
            <ul role="list" className={styles.subList} inert={!isOpen}>
              {item.children!.map((child) => renderItem(child, depth + 1))}
            </ul>
          </div>
        )}
      </li>
    );
  };

  const renderSections = (list: SidebarSection[]) =>
    list.map((section) => (
      <div key={section.id} className={styles.section}>
        {section.title && (
          <div className={cx(styles.sectionTitle, styles.stagger)} style={{ "--i": order++ } as CSSProperties}>
            {section.title}
          </div>
        )}
        <ul role="list" className={styles.list}>
          {section.items.map((item) => renderItem(item))}
        </ul>
      </div>
    ));

  return (
    <>
      {trigger ? (
        trigger(triggerProps)
      ) : (
        <button type="button" className={styles.toggle} data-open={open} {...triggerProps}>
          <Bars />
        </button>
      )}

      {mounted && (
        <Portal>
          <div className={styles.root} data-visible={visible} data-placement={placement}>
            <div className={styles.overlay} aria-hidden="true" onClick={() => setOpen(false)} />
            <div
              ref={panelRef}
              id={id}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              className={cx(styles.panel, className)}
            >
              <header className={styles.header}>
                {brand && (
                  <div className={styles.brand}>
                    {brand.logo && <span className={styles.brandLogo}>{brand.logo}</span>}
                    {brand.title && <span className={styles.brandTitle}>{brand.title}</span>}
                  </div>
                )}
                <div className={styles.headerActions}>
                  {headerActions}
                  <button
                    type="button"
                    className={styles.toggle}
                    data-open={visible}
                    onClick={() => setOpen(false)}
                    aria-label={closeLabel}
                    data-skip-autofocus
                  >
                    <Bars />
                  </button>
                </div>
              </header>

              {user && (
                <div className={styles.stagger} style={{ "--i": order++ } as CSSProperties}>
                  <button type="button" className={styles.user} onClick={onUserClick} disabled={!onUserClick}>
                    <Avatar src={user.avatarSrc} name={user.name} size={42} status={user.status} />
                    <span className={styles.userText}>
                      <span className={styles.userName}>{user.name}</span>
                      {user.subtitle && <span className={styles.userSubtitle}>{user.subtitle}</span>}
                    </span>
                    {onUserClick && (
                      <span className={styles.userChevron}>
                        <ChevronRightIcon size={16} />
                      </span>
                    )}
                  </button>
                </div>
              )}

              <nav className={styles.nav} aria-label={title}>
                {renderSections(sections)}
                {/* No mobile o rodapé rola junto: telas baixas não perdem espaço da navegação */}
                {footerSections?.length ? <div className={styles.navFooter}>{renderSections(footerSections)}</div> : null}
              </nav>

              {footer && (
                <div className={cx(styles.footer, styles.stagger)} style={{ "--i": order++ } as CSSProperties}>
                  {footer}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
