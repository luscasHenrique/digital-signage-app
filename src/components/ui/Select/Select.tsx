"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useClickOutside, useControllableState, useFloatingPosition, usePresence } from "../_internal/hooks";
import { AlertCircleIcon, CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon } from "../_internal/icons";
import { Portal } from "../_internal/Portal";
import { Field, fieldMessageId, fieldStyles as s, resolveStatus, type FieldStatusProps } from "../Field/Field";
import styles from "./Select.module.css";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Agrupa opções sob um título */
  group?: string;
};

/** Props compartilhadas por Select e MultiSelect */
export type SelectCommonProps = FieldStatusProps & {
  options: SelectOption[];
  label?: ReactNode;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  leftIcon?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  /** Campo de busca no topo da lista (ignora acentos e destaca o termo) */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Texto quando a busca não encontra nada */
  emptyText?: string;
  /** Botão para limpar a seleção */
  clearable?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  name?: string;
  id?: string;
  "aria-label"?: string;
  /** Classe do controle (casca de vidro) */
  className?: string;
  /** Classe do wrapper externo (Field) */
  containerClassName?: string;
};

export type SelectProps = SelectCommonProps & {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Usa o <select> nativo (picker do sistema no iOS/Android). Ignora searchable/clearable. */
  native?: boolean;
};

type SelectCoreProps = SelectCommonProps & {
  multiple: boolean;
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  maxVisibleChips?: number;
  selectAll?: boolean;
  selectAllLabel?: string;
  maxSelected?: number;
};

const normalize = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const isPrintable = (e: KeyboardEvent) => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? normalize(text).indexOf(normalize(query)) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className={styles.mark}>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

/**
 * Núcleo do Select/MultiSelect: gatilho na casca de vidro + lista flutuante
 * no estilo do DropdownMenu. O foco fica no gatilho (ou na busca) e a lista
 * usa aria-activedescendant.
 */
export function SelectCore({
  options,
  multiple,
  selected,
  onSelectedChange,
  label,
  placeholder = "Selecione...",
  size = "md",
  leftIcon,
  disabled,
  required,
  optional,
  searchable = false,
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado",
  clearable = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  name,
  id: idProp,
  "aria-label": ariaLabel,
  hint,
  error,
  success,
  className,
  containerClassName,
  maxVisibleChips = 3,
  selectAll = false,
  selectAllLabel = "Selecionar todos",
  maxSelected,
}: SelectCoreProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-listbox`;

  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [listWidth, setListWidth] = useState<number>();
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: "", timer: 0 });
  const { mounted, visible } = usePresence(open, 200);
  const pos = useFloatingPosition(controlRef, listRef, { open: mounted, placement: "bottom-start", offset: 6 });
  const { invalid, valid, hasMessage } = resolveStatus({ error, success, hint });

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const selectedOptions = selected.map((v) => byValue.get(v)).filter(Boolean) as SelectOption[];

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((o) => normalize(o.label).includes(q) || (o.description && normalize(o.description).includes(q)));
  }, [options, query]);

  const limitReached = multiple && maxSelected !== undefined && selected.length >= maxSelected;
  const isDisabled = (o: SelectOption) => Boolean(o.disabled) || (limitReached && !selected.includes(o.value));
  const navigable = filtered.filter((o) => !isDisabled(o));

  // "Selecionar todos" entra na navegação como índice 0
  const showSelectAll = multiple && selectAll && !query.trim() && maxSelected === undefined && navigable.length > 0;
  const offset = showSelectAll ? 1 : 0;
  const totalItems = navigable.length + offset;
  const allSelected = navigable.length > 0 && navigable.every((o) => selected.includes(o.value));
  const someSelected = navigable.some((o) => selected.includes(o.value));

  const openList = (index?: number) => {
    if (disabled) return;
    setListWidth(controlRef.current?.offsetWidth);
    if (index !== undefined) setHighlight(index);
    else {
      const found = navigable.findIndex((o) => selected.includes(o.value));
      setHighlight(found >= 0 ? found + offset : 0);
    }
    setOpen(true);
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    setQuery("");
    if (returnFocus) triggerRef.current?.focus();
  };
  useClickOutside([controlRef, listRef], () => close(false), open);

  // Com busca, o foco vai para o campo ao abrir
  useEffect(() => {
    if (!open || !mounted || !searchable) return;
    const raf = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [open, mounted, searchable]);

  const choose = (option: SelectOption) => {
    if (isDisabled(option)) return;
    if (multiple) {
      onSelectedChange(
        selected.includes(option.value) ? selected.filter((v) => v !== option.value) : [...selected, option.value],
      );
    } else {
      onSelectedChange([option.value]);
      close();
    }
  };

  const toggleAll = () => {
    const values = navigable.map((o) => o.value);
    onSelectedChange(
      allSelected ? selected.filter((v) => !values.includes(v)) : [...selected, ...values.filter((v) => !selected.includes(v))],
    );
  };

  const activate = () => {
    if (showSelectAll && highlight === 0) toggleAll();
    else if (navigable[highlight - offset]) choose(navigable[highlight - offset]);
  };

  // Typeahead: digitar letras pula para a próxima opção correspondente
  const jumpTo = (key: string) => {
    const t = typeahead.current;
    window.clearTimeout(t.timer);
    t.text += key.toLowerCase();
    t.timer = window.setTimeout(() => (t.text = ""), 500);
    const current = open ? highlight - offset : navigable.findIndex((o) => selected.includes(o.value));
    const from = t.text.length === 1 ? current + 1 : Math.max(current, 0);
    const ordered = [...navigable.slice(from), ...navigable.slice(0, from)];
    const match = ordered.find((o) => normalize(o.label).startsWith(normalize(t.text)));
    if (!match) return;
    const index = navigable.indexOf(match) + offset;
    if (open) setHighlight(index);
    else openList(index);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const fromSearch = e.currentTarget === searchRef.current;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList(e.key === "ArrowUp" ? Math.max(totalItems - 1, 0) : undefined);
      } else if (e.key === "Backspace" && multiple && selected.length && !disabled) {
        onSelectedChange(selected.slice(0, -1));
      } else if (isPrintable(e) && /\S/.test(e.key)) {
        if (searchable) {
          e.preventDefault();
          setQuery(e.key);
          openList(0);
        } else jumpTo(e.key);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (totalItems ? (h + 1) % totalItems : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (totalItems ? (h - 1 + totalItems) % totalItems : 0));
    } else if ((e.key === "Home" || e.key === "End") && !fromSearch) {
      e.preventDefault();
      setHighlight(e.key === "Home" ? 0 : Math.max(totalItems - 1, 0));
    } else if (e.key === "Enter" || (e.key === " " && !fromSearch)) {
      e.preventDefault();
      activate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // A busca vive num portal: devolve o foco ao gatilho em vez de perdê-lo
      if (fromSearch) e.preventDefault();
      close(fromSearch);
    } else if (!fromSearch && isPrintable(e) && /\S/.test(e.key)) {
      jumpTo(e.key);
    }
  };

  const activeOption = open ? navigable[highlight - offset] : undefined;
  const activeId = !open
    ? undefined
    : showSelectAll && highlight === 0
      ? `${id}-all`
      : activeOption
        ? `${id}-opt-${activeOption.value}`
        : undefined;

  // Agrupamento preservando a ordem
  const groups: Array<{ group?: string; items: SelectOption[] }> = [];
  for (const o of filtered) {
    const last = groups.at(-1);
    if (last && last.group === o.group) last.items.push(o);
    else groups.push({ group: o.group, items: [o] });
  }

  const hasValue = selected.length > 0;
  const visibleChips = selectedOptions.slice(0, maxVisibleChips);
  const hiddenCount = selectedOptions.length - visibleChips.length;

  const value = !hasValue ? (
    <span className={cx(styles.value, styles.placeholder)}>{placeholder}</span>
  ) : multiple ? (
    <>
      {visibleChips.map((o) => (
        <span key={o.value} className={styles.chip}>
          <span className={styles.chipLabel}>{o.label}</span>
          {!disabled && (
            <span
              className={styles.chipRemove}
              aria-hidden="true"
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onSelectedChange(selected.filter((v) => v !== o.value));
              }}
            >
              <CloseIcon size={11} />
            </span>
          )}
        </span>
      ))}
      {hiddenCount > 0 && <span className={cx(styles.chip, styles.chipMore)}>+{hiddenCount}</span>}
    </>
  ) : (
    <>
      {selectedOptions[0].icon && <span className={styles.valueIcon}>{selectedOptions[0].icon}</span>}
      <span className={styles.value}>{selectedOptions[0].label}</span>
    </>
  );

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      success={success}
      required={required}
      optional={optional}
      className={containerClassName}
    >
      <div
        ref={controlRef}
        className={cx(s.control, styles.control, multiple && styles.multiple, className)}
        data-size={size}
        data-invalid={invalid}
        data-success={valid}
        data-disabled={disabled}
        data-open={open}
        onClick={(e) => {
          // Clique no padding/ícones da casca também abre
          if ((e.target as HTMLElement).closest("button")) return;
          triggerRef.current?.focus();
          if (open) close();
          else openList();
        }}
      >
        {leftIcon && <span className={cx(s.adornment, s.adornmentStart)}>{leftIcon}</span>}

        <button
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={searchable ? undefined : activeId}
          aria-invalid={invalid || undefined}
          aria-describedby={hasMessage ? fieldMessageId(id) : undefined}
          aria-required={required || undefined}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cx(s.input, styles.trigger)}
          onClick={() => (open ? close() : openList())}
          onKeyDown={onKeyDown}
        >
          {value}
        </button>

        {invalid && (
          <span className={s.statusIcon} data-tone="danger">
            <AlertCircleIcon size={17} />
          </span>
        )}
        {clearable && hasValue && !disabled && (
          <button
            type="button"
            className={cx(s.inlineAction, s.clearAppear)}
            aria-label="Limpar seleção"
            tabIndex={-1}
            onClick={() => {
              onSelectedChange([]);
              triggerRef.current?.focus();
            }}
          >
            <CloseIcon size={14} />
          </button>
        )}
        <span className={cx(s.adornment, styles.chevron)} data-open={open}>
          <ChevronDownIcon />
        </span>
        {name && selected.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      </div>

      {mounted && (
        <Portal>
          <div
            ref={listRef}
            className={styles.popup}
            data-visible={visible}
            data-side={pos.side}
            style={{ top: pos.top, left: pos.left, width: listWidth }}
            onPointerDown={(e) => {
              // Mantém o foco no gatilho/busca ao clicar nas opções
              if (e.target !== searchRef.current) e.preventDefault();
            }}
          >
            {searchable && (
              <div className={styles.search}>
                <SearchIcon size={15} />
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeId}
                  aria-label={searchPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  className={styles.searchInput}
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={onKeyDown}
                />
              </div>
            )}

            <div
              id={listId}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              aria-label={typeof label === "string" ? label : ariaLabel}
              className={styles.list}
            >
              {showSelectAll && (
                <>
                  <div
                    id={`${id}-all`}
                    role="option"
                    aria-selected={allSelected}
                    className={cx(styles.option, styles.selectAll)}
                    data-active={highlight === 0}
                    onPointerEnter={() => setHighlight(0)}
                    onClick={toggleAll}
                  >
                    <span
                      className={styles.box}
                      data-state={allSelected ? "checked" : someSelected ? "mixed" : "unchecked"}
                    >
                      {someSelected && !allSelected ? <span className={styles.dash} /> : <CheckIcon size={12} />}
                    </span>
                    <span className={styles.optionText}>{selectAllLabel}</span>
                  </div>
                  <div className={styles.separator} role="presentation" />
                </>
              )}

              {groups.map((g, gi) => (
                <div key={gi} role="group" aria-label={g.group}>
                  {g.group && <div className={styles.groupLabel}>{g.group}</div>}
                  {g.items.map((o) => {
                    const isSelected = selected.includes(o.value);
                    const isActive = activeOption?.value === o.value;
                    const off = isDisabled(o);
                    return (
                      <div
                        key={o.value}
                        id={`${id}-opt-${o.value}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={off || undefined}
                        className={styles.option}
                        data-active={isActive}
                        onPointerEnter={() => {
                          const idx = navigable.indexOf(o);
                          if (idx >= 0) setHighlight(idx + offset);
                        }}
                        onClick={() => choose(o)}
                        ref={(el) => {
                          if (isActive) el?.scrollIntoView({ block: "nearest" });
                        }}
                      >
                        {multiple && (
                          <span className={styles.box} data-state={isSelected ? "checked" : "unchecked"}>
                            <CheckIcon size={12} />
                          </span>
                        )}
                        {o.icon && <span className={styles.optionIcon}>{o.icon}</span>}
                        <span className={styles.optionText}>
                          <span>
                            <Highlight text={o.label} query={query.trim()} />
                          </span>
                          {o.description && <span className={styles.optionDescription}>{o.description}</span>}
                        </span>
                        {!multiple && (
                          <span className={styles.optionCheck} data-checked={isSelected}>
                            <CheckIcon size={15} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {filtered.length === 0 && <div className={styles.empty}>{emptyText}</div>}
            </div>
          </div>
        </Portal>
      )}
    </Field>
  );
}

/** Select nativo: picker do sistema no mobile, com a casca de vidro. */
function NativeSelect({
  options,
  value,
  onValueChange,
  label,
  placeholder,
  size = "md",
  leftIcon,
  disabled,
  required,
  optional,
  name,
  id: idProp,
  "aria-label": ariaLabel,
  hint,
  error,
  success,
  className,
  containerClassName,
}: SelectCommonProps & { value: string | null; onValueChange: (value: string | null) => void }) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const { invalid, valid, hasMessage } = resolveStatus({ error, success, hint });

  const groups: Array<{ group?: string; items: SelectOption[] }> = [];
  for (const o of options) {
    const last = groups.at(-1);
    if (last && last.group === o.group) last.items.push(o);
    else groups.push({ group: o.group, items: [o] });
  }
  const renderOption = (o: SelectOption) => (
    <option key={o.value} value={o.value} disabled={o.disabled}>
      {o.label}
    </option>
  );

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      success={success}
      required={required}
      optional={optional}
      className={containerClassName}
    >
      <div
        className={cx(s.control, styles.control, className)}
        data-size={size}
        data-invalid={invalid}
        data-success={valid}
        data-disabled={disabled}
      >
        {leftIcon && <span className={cx(s.adornment, s.adornmentStart)}>{leftIcon}</span>}
        <select
          id={id}
          name={name}
          className={cx(s.input, styles.native)}
          required={required}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={hasMessage ? fieldMessageId(id) : undefined}
          data-empty={!value}
          value={value ?? ""}
          onChange={(e) => onValueChange(e.target.value || null)}
        >
          {(placeholder || !value) && (
            <option value="" disabled>
              {placeholder ?? ""}
            </option>
          )}
          {groups.map((g, gi) =>
            g.group ? (
              <optgroup key={gi} label={g.group}>
                {g.items.map(renderOption)}
              </optgroup>
            ) : (
              g.items.map(renderOption)
            ),
          )}
        </select>
        {invalid && (
          <span className={s.statusIcon} data-tone="danger">
            <AlertCircleIcon size={17} />
          </span>
        )}
        <span className={cx(s.adornment, styles.chevron, styles.nativeChevron)}>
          <ChevronDownIcon />
        </span>
      </div>
    </Field>
  );
}

/**
 * Select de vidro: lista flutuante com a estética do DropdownMenu, busca
 * opcional (`searchable`), grupos, ícones e descrições. Use `native` para
 * manter o picker do sistema no mobile.
 */
export function Select({ value, defaultValue = null, onValueChange, native, ...props }: SelectProps) {
  const [selected, setSelected] = useControllableState<string | null>(value, defaultValue, onValueChange);

  if (native) return <NativeSelect {...props} value={selected} onValueChange={setSelected} />;

  return (
    <SelectCore
      {...props}
      multiple={false}
      selected={selected ? [selected] : []}
      onSelectedChange={(next) => setSelected(next[0] ?? null)}
    />
  );
}
