"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Checkbox } from "../Checkbox/Checkbox";
import { cx } from "../_internal/cx";
import { useControllableState } from "../_internal/hooks";
import { ChevronLeftIcon, ChevronRightIcon } from "../_internal/icons";
import styles from "./Table.module.css";

export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection } | null;

export type TableColumn<T> = {
  key: string;
  header: ReactNode;
  /** Renderização da célula. Padrão: row[key] */
  cell?: (row: T, index: number) => ReactNode;
  /** Valor usado para ordenar. Padrão: row[key] */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: number | string;
  /** Esconde a coluna em telas pequenas (< 640px) */
  hideOnMobile?: boolean;
};

export type TableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** Checkbox por linha + selecionar todos */
  selectable?: boolean;
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (keys: string[]) => void;
  sort?: SortState;
  defaultSort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Ordenação feita fora (ex.: no servidor): não reordena os dados */
  manualSort?: boolean;
  /** Paginação interna */
  pageSize?: number;
  loading?: boolean;
  /** Conteúdo quando não há linhas */
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  density?: "compact" | "comfortable";
  striped?: boolean;
  stickyHeader?: boolean;
  /** Altura máxima com rolagem (combina com stickyHeader) */
  maxHeight?: number | string;
  caption?: string;
  /** Conteúdo acima da tabela (busca, filtros, ações em massa) */
  toolbar?: ReactNode;
  className?: string;
};

const SortIcon = ({ direction }: { direction?: SortDirection }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={styles.sortIcon} data-direction={direction}>
    <path d="M6 2 9 5H3z" className={styles.sortUp} />
    <path d="M6 10 3 7h6z" className={styles.sortDown} />
  </svg>
);

function compare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

export function Table<T>({
  columns,
  data,
  rowKey,
  selectable,
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSort,
  pageSize,
  loading,
  empty = "Nenhum registro encontrado",
  onRowClick,
  density = "comfortable",
  striped,
  stickyHeader,
  maxHeight,
  caption,
  toolbar,
  className,
}: TableProps<T>) {
  const [selected, setSelected] = useControllableState(selectedProp, defaultSelected, onSelectedChange);
  const [sort, setSort] = useControllableState<SortState>(sortProp, defaultSort, onSortChange);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort || manualSort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const get = col.sortValue ?? ((row: T) => (row as Record<string, unknown>)[col.key] as string);
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...data].sort((a, b) => compare(get(a), get(b)) * factor);
  }, [data, sort, columns, manualSort]);

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const rows = pageSize ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize) : sorted;

  const visibleKeys = rows.map(rowKey);
  const allChecked = visibleKeys.length > 0 && visibleKeys.every((k) => selected.includes(k));
  const someChecked = visibleKeys.some((k) => selected.includes(k)) && !allChecked;

  const toggleSort = (key: string) => {
    if (!sort || sort.key !== key) setSort({ key, direction: "asc" });
    else if (sort.direction === "asc") setSort({ key, direction: "desc" });
    else setSort(null);
  };

  const toggleAll = () =>
    setSelected(
      allChecked ? selected.filter((k) => !visibleKeys.includes(k)) : Array.from(new Set([...selected, ...visibleKeys])),
    );

  const toggleRow = (key: string) =>
    setSelected(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  const colCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className={cx(styles.root, className)} data-density={density}>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      <div className={styles.scroll} style={{ maxHeight } as CSSProperties} data-sticky={stickyHeader}>
        <table className={styles.table} aria-busy={loading || undefined}>
          {caption && <caption className="lg-sr-only">{caption}</caption>}
          <thead>
            <tr>
              {selectable && (
                <th className={styles.checkCell} scope="col">
                  <Checkbox
                    size="sm"
                    aria-label="Selecionar todos"
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={toggleAll}
                    disabled={loading || rows.length === 0}
                  />
                </th>
              )}
              {columns.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width, textAlign: col.align }}
                    data-hide-mobile={col.hideOnMobile}
                    aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : col.sortable ? "none" : undefined}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className={styles.sortButton}
                        data-active={active}
                        data-align={col.align}
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.header}
                        <SortIcon direction={active ? sort!.direction : undefined} />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize ?? 5 }, (_, i) => (
                <tr key={`sk-${i}`} className={styles.skeletonRow}>
                  {selectable && (
                    <td className={styles.checkCell}>
                      <span className={styles.skeleton} style={{ width: 16 }} />
                    </td>
                  )}
                  {columns.map((col, ci) => (
                    <td key={col.key} data-hide-mobile={col.hideOnMobile}>
                      <span className={styles.skeleton} style={{ width: `${50 + ((i * 7 + ci * 13) % 40)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={styles.empty}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const key = rowKey(row);
                const isSelected = selected.includes(key);
                return (
                  <tr
                    key={key}
                    className={styles.row}
                    data-selected={isSelected}
                    data-striped={striped && i % 2 === 1}
                    data-clickable={Boolean(onRowClick)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    style={{ animationDelay: `${i * 18}ms` }}
                  >
                    {selectable && (
                      <td className={styles.checkCell} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          size="sm"
                          aria-label="Selecionar linha"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} style={{ textAlign: col.align }} data-hide-mobile={col.hideOnMobile}>
                        {col.cell ? col.cell(row, i) : String((row as Record<string, unknown>)[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(pageSize || (selectable && selected.length > 0)) && (
        <div className={styles.footer}>
          <span className={styles.footerInfo}>
            {selectable && selected.length > 0
              ? `${selected.length} selecionado${selected.length > 1 ? "s" : ""}`
              : `${sorted.length} registro${sorted.length === 1 ? "" : "s"}`}
          </span>
          {pageSize && pageCount > 1 && (
            <div className={styles.pagination}>
              <span className={styles.footerInfo}>
                {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} de {sorted.length}
              </span>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                aria-label="Página anterior"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                aria-label="Próxima página"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
