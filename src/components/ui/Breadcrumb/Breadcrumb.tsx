"use client";

import { Fragment, useState, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { ChevronRightIcon } from "../_internal/icons";
import { DropdownMenu } from "../DropdownMenu/DropdownMenu";
import styles from "./Breadcrumb.module.css";

export type BreadcrumbItem = {
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export type BreadcrumbLinkProps = {
  href: string;
  className: string;
  children: ReactNode;
  onClick?: () => void;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  /** Separador entre itens. Padrão: chevron › */
  separator?: ReactNode;
  /** Acima disso, os itens do meio viram um menu "…" */
  maxItems?: number;
  /** Quantos itens manter no início/fim ao recolher */
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
  /** "plain" (texto) ou "glass" (pílula de vidro) */
  variant?: "plain" | "glass";
  size?: "sm" | "md";
  /** Integração com roteador (ex.: next/link) */
  renderLink?: (props: BreadcrumbLinkProps) => ReactNode;
  ariaLabel?: string;
  className?: string;
};

const defaultLink = ({ href, className, children, onClick }: BreadcrumbLinkProps) => (
  <a href={href} className={className} onClick={onClick}>
    {children}
  </a>
);

export function Breadcrumb({
  items,
  separator,
  maxItems = 5,
  itemsBeforeCollapse = 1,
  itemsAfterCollapse = 2,
  variant = "plain",
  size = "md",
  renderLink = defaultLink,
  ariaLabel = "Trilha de navegação",
  className,
}: BreadcrumbProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = !expanded && items.length > maxItems && itemsBeforeCollapse + itemsAfterCollapse < items.length;

  const head = shouldCollapse ? items.slice(0, itemsBeforeCollapse) : items;
  const hidden = shouldCollapse ? items.slice(itemsBeforeCollapse, items.length - itemsAfterCollapse) : [];
  const tail = shouldCollapse ? items.slice(items.length - itemsAfterCollapse) : [];

  const sep = (
    <li className={styles.separator} aria-hidden="true">
      {separator ?? <ChevronRightIcon size={14} />}
    </li>
  );

  const renderItem = (item: BreadcrumbItem, isLast: boolean, key: number) => {
    const content = (
      <>
        {item.icon && <span className={styles.icon}>{item.icon}</span>}
        <span className={styles.label}>{item.label}</span>
      </>
    );
    return (
      <li key={key} className={styles.item}>
        {isLast ? (
          <span className={cx(styles.link, styles.current)} aria-current="page">
            {content}
          </span>
        ) : item.href ? (
          renderLink({ href: item.href, className: styles.link, children: content, onClick: item.onClick })
        ) : item.onClick ? (
          <button type="button" className={styles.link} onClick={item.onClick}>
            {content}
          </button>
        ) : (
          <span className={cx(styles.link, styles.static)}>{content}</span>
        )}
      </li>
    );
  };

  const all: ReactNode[] = [];
  head.forEach((item, i) => {
    if (i > 0) all.push(<Fragment key={`s-h-${i}`}>{sep}</Fragment>);
    all.push(renderItem(item, !shouldCollapse && i === items.length - 1, i));
  });

  if (shouldCollapse) {
    all.push(<Fragment key="s-c1">{sep}</Fragment>);
    all.push(
      <li key="collapsed" className={styles.item}>
        <DropdownMenu
          width={220}
          trigger={(props) => (
            <button {...props} type="button" className={cx(styles.link, styles.ellipsis)} aria-label={`Mostrar mais ${hidden.length} níveis`}>
              …
            </button>
          )}
          items={[
            ...hidden.map((h) => ({
              label: h.label,
              icon: h.icon,
              onSelect: () => {
                if (h.onClick) h.onClick();
                else if (h.href) window.location.assign(h.href);
              },
            })),
            { type: "separator" as const },
            { label: "Mostrar caminho completo", onSelect: () => setExpanded(true) },
          ]}
        />
      </li>,
    );
    tail.forEach((item, i) => {
      all.push(<Fragment key={`s-t-${i}`}>{sep}</Fragment>);
      all.push(renderItem(item, i === tail.length - 1, 1000 + i));
    });
  }

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className={styles.list} data-variant={variant} data-size={size}>
        {all}
      </ol>
    </nav>
  );
}
