"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "../Avatar/Avatar";
import { Badge, formatCount } from "../Badge/Badge";
import { cx } from "../_internal/cx";
import { useControllableState } from "../_internal/hooks";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "../_internal/icons";
import { TextField } from "../TextField/TextField";
import { Tooltip } from "../Tooltip/Tooltip";
import styles from "./Sidebar.module.css";

/* ============================== Tipos ============================== */

export type SidebarItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  /** Número (vira contador) ou qualquer conteúdo */
  badge?: number | ReactNode;
  /** Sub-itens: viram um dropdown animado */
  children?: SidebarItem[];
  disabled?: boolean;
  onClick?: () => void;
};

export type SidebarSection = {
  id: string;
  title?: string;
  items: SidebarItem[];
};

export type SidebarUser = {
  name: string;
  subtitle?: ReactNode;
  avatarSrc?: string;
  status?: "online" | "away" | "busy" | "offline";
};

export type SidebarLinkProps = {
  href: string;
  className: string;
  children: ReactNode;
  onClick?: () => void;
  "aria-current"?: "page";
  "aria-disabled"?: boolean;
  "data-active"?: boolean;
  "data-child-active"?: boolean;
};

export type SidebarProps = {
  sections: SidebarSection[];
  /** Seções fixas no rodapé (ex.: Configurações, Sair) */
  footerSections?: SidebarSection[];
  /** id do item ativo */
  activeId?: string;
  onItemSelect?: (item: SidebarItem) => void;

  brand?: { logo?: ReactNode; title?: ReactNode };
  /** Ações no topo (ex.: <NotificationBell />) */
  headerActions?: ReactNode;

  user?: SidebarUser;
  onUserClick?: () => void;
  /** Rótulo do botão do usuário (ex.: "Trocar conta") */
  userActionLabel?: string;

  searchable?: boolean;
  searchPlaceholder?: string;
  /** Se informado, a busca é externa (o componente não filtra sozinho) */
  onSearchChange?: (query: string) => void;

  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Atalho ⌘/Ctrl + B para recolher. Padrão: true */
  keyboardShortcut?: boolean;

  /** Integração com roteadores (ex.: next/link). Padrão: <a>. */
  renderLink?: (props: SidebarLinkProps) => ReactNode;

  width?: number;
  collapsedWidth?: number;
  /** Conteúdo livre no fim da sidebar */
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/* ============================== Helpers ============================== */

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function filterItems(items: SidebarItem[], query: string): SidebarItem[] {
  if (!query) return items;
  const q = normalize(query);
  return items.flatMap((item) => {
    const selfMatch = normalize(item.label).includes(q);
    const kids = item.children ? filterItems(item.children, query) : undefined;
    if (selfMatch) return [item];
    if (kids && kids.length) return [{ ...item, children: kids }];
    return [];
  });
}

function containsId(item: SidebarItem, id?: string): boolean {
  if (!id) return false;
  return item.children?.some((c) => c.id === id || containsId(c, id)) ?? false;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = normalize(text).indexOf(normalize(query));
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.mark}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const defaultLink = ({ href, className, children, onClick, ...rest }: SidebarLinkProps) => (
  <a href={href} className={className} onClick={onClick} {...rest}>
    {children}
  </a>
);

/* ============================== Componente ============================== */

export function Sidebar({
  sections,
  footerSections,
  activeId,
  onItemSelect,
  brand,
  headerActions,
  user,
  onUserClick,
  userActionLabel = "Trocar conta",
  searchable = true,
  searchPlaceholder = "Buscar...",
  onSearchChange,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  keyboardShortcut = true,
  renderLink = defaultLink,
  width = 280,
  collapsedWidth = 76,
  footer,
  className,
  style,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useControllableState(collapsedProp, defaultCollapsed, onCollapsedChange);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Grupos abertos: inicia com o grupo que contém o item ativo
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const set = new Set<string>();
    [...sections, ...(footerSections ?? [])].forEach((s) =>
      s.items.forEach((i) => containsId(i, activeId) && set.add(i.id)),
    );
    return set;
  });

  const toggleGroup = (id: string, force?: boolean) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      const shouldOpen = force ?? !next.has(id);
      if (shouldOpen) next.add(id);
      else next.delete(id);
      return next;
    });

  useEffect(() => {
    if (!keyboardShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed(!collapsed);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboardShortcut, collapsed, setCollapsed]);

  const internalFilter = !onSearchChange;
  const activeQuery = internalFilter && !collapsed ? query.trim() : "";

  const visibleSections = useMemo(
    () =>
      sections
        .map((s) => ({ ...s, items: filterItems(s.items, activeQuery) }))
        .filter((s) => s.items.length > 0),
    [sections, activeQuery],
  );

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearchChange?.(value);
  };

  const expandAndSearch = () => {
    setCollapsed(false);
    setTimeout(() => searchRef.current?.focus(), 260);
  };

  /* ---------- Renderização de um item ---------- */
  const renderItem = (item: SidebarItem, depth = 0): ReactNode => {
    const hasChildren = Boolean(item.children?.length);
    const isActive = item.id === activeId;
    const childActive = containsId(item, activeId);
    const isOpen = hasChildren && (openGroups.has(item.id) || Boolean(activeQuery)) && !collapsed;
    const count = typeof item.badge === "number" ? formatCount(item.badge) : null;
    const badgeNode = typeof item.badge === "number" ? count : item.badge;

    const inner = (
      <>
        {depth === 0 ? (
          <span className={styles.itemIcon}>
            {item.icon ?? <span className={styles.iconFallback}>{item.label[0]}</span>}
            {collapsed && badgeNode && <span className={styles.iconDot} />}
          </span>
        ) : (
          <span className={styles.subBullet}>{item.icon}</span>
        )}
        <span className={styles.itemLabel}>
          <Highlight text={item.label} query={activeQuery} />
        </span>
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
            <ChevronDownIcon size={15} />
          </span>
        )}
      </>
    );

    const select = () => {
      if (item.disabled) return;
      if (hasChildren) {
        if (collapsed) {
          setCollapsed(false);
          toggleGroup(item.id, true);
        } else {
          toggleGroup(item.id);
        }
        return;
      }
      item.onClick?.();
      onItemSelect?.(item);
    };

    const className = cx(styles.item, depth > 0 && styles.subItem);
    const common = {
      "data-active": isActive,
      "data-child-active": childActive,
    };

    const element =
      item.href && !hasChildren ? (
        renderLink({
          href: item.href,
          className,
          children: inner,
          onClick: select,
          "aria-current": isActive ? "page" : undefined,
          "aria-disabled": item.disabled || undefined,
          ...common,
        })
      ) : (
        <button
          type="button"
          className={className}
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
      <li key={item.id} className={styles.li}>
        {depth === 0 ? (
          <Tooltip
            content={item.label}
            placement="right"
            offset={14}
            delay={80}
            disabled={!collapsed}
            className={styles.tooltipAnchor}
          >
            {element}
          </Tooltip>
        ) : (
          element
        )}
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
          <div className={styles.sectionTitle}>
            <span>{section.title}</span>
          </div>
        )}
        <ul role="list" className={styles.list}>
          {section.items.map((item) => renderItem(item))}
        </ul>
      </div>
    ));

  return (
    <aside
      className={cx(styles.sidebar, className)}
      data-collapsed={collapsed}
      style={
        {
          "--sb-width": `${width}px`,
          "--sb-collapsed": `${collapsedWidth}px`,
          ...style,
        } as CSSProperties
      }
      aria-label="Navegação principal"
    >
      {/* ---------- Header ---------- */}
      <div className={styles.header}>
        {brand && (
          <div className={styles.brand}>
            {brand.logo && <span className={styles.brandLogo}>{brand.logo}</span>}
            {brand.title && <span className={styles.brandTitle}>{brand.title}</span>}
          </div>
        )}
        {headerActions && <div className={styles.headerActions}>{headerActions}</div>}
      </div>

      <Tooltip
        content={collapsed ? "Expandir" : "Recolher"}
        shortcut={keyboardShortcut ? "Ctrl B" : undefined}
        placement="right"
        className={styles.collapseAnchor}
      >
        <button
          type="button"
          className={styles.collapseButton}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
        </button>
      </Tooltip>

      {/* ---------- Usuário ---------- */}
      {user && (
        <Tooltip content={user.name} placement="right" offset={14} disabled={!collapsed} className={styles.tooltipAnchor}>
          <button
            type="button"
            className={styles.user}
            onClick={onUserClick}
            disabled={!onUserClick}
            aria-label={collapsed ? user.name : undefined}
          >
            <Avatar src={user.avatarSrc} name={user.name} size={collapsed ? 40 : 42} status={user.status} />
            <span className={styles.userText}>
              <span className={styles.userName}>{user.name}</span>
              {(user.subtitle ?? userActionLabel) && (
                <span className={styles.userSubtitle}>{user.subtitle ?? userActionLabel}</span>
              )}
            </span>
            {onUserClick && (
              <span className={styles.userChevron}>
                <ChevronRightIcon size={15} />
              </span>
            )}
          </button>
        </Tooltip>
      )}

      {/* ---------- Busca ---------- */}
      {searchable && (
        <div className={styles.search}>
          {collapsed ? (
            <Tooltip content="Buscar" placement="right" offset={14} className={styles.tooltipAnchor}>
              <button type="button" className={styles.searchButton} onClick={expandAndSearch} aria-label="Buscar">
                <SearchIcon size={18} />
              </button>
            </Tooltip>
          ) : (
            <TextField
              ref={searchRef}
              type="search"
              size="sm"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Buscar no menu"
              containerClassName={styles.searchField}
            />
          )}
        </div>
      )}

      {/* ---------- Navegação ---------- */}
      <nav className={styles.nav}>
        {renderSections(visibleSections)}
        {activeQuery && visibleSections.length === 0 && (
          <p className={styles.empty}>Nenhum resultado para “{query}”</p>
        )}
      </nav>

      {/* ---------- Rodapé ---------- */}
      {(footerSections?.length || footer) && (
        <div className={styles.footer}>
          {footerSections && renderSections(footerSections)}
          {footer}
        </div>
      )}
    </aside>
  );
}
