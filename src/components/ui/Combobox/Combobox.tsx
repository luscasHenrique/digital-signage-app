"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useClickOutside, useControllableState, useFloatingPosition, usePresence } from "../_internal/hooks";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "../_internal/icons";
import { Portal } from "../_internal/Portal";
import { Field, fieldMessageId, fieldStyles as s, resolveStatus, type FieldStatusProps } from "../Field/Field";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Combobox.module.css";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Agrupa opções sob um título */
  group?: string;
};

type BaseProps = FieldStatusProps & {
  options: ComboboxOption[];
  label?: ReactNode;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  leftIcon?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  /** Texto quando a busca não encontra nada */
  emptyText?: string;
  /** Mostra "Criar “termo”" quando não há correspondência exata */
  onCreate?: (query: string) => void;
  /** Busca externa/assíncrona: desliga o filtro interno */
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  clearable?: boolean;
  name?: string;
  id?: string;
  className?: string;
};

export type ComboboxProps =
  | (BaseProps & {
      multiple?: false;
      value?: string | null;
      defaultValue?: string | null;
      onValueChange?: (value: string | null) => void;
    })
  | (BaseProps & {
      multiple: true;
      value?: string[];
      defaultValue?: string[];
      onValueChange?: (value: string[]) => void;
    });

const normalize = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

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

export function Combobox(props: ComboboxProps) {
  const {
    options,
    label,
    placeholder = "Selecione...",
    size = "md",
    leftIcon,
    disabled,
    required,
    optional,
    emptyText = "Nenhum resultado",
    onCreate,
    onSearchChange,
    loading,
    clearable = true,
    name,
    id: idProp,
    hint,
    error,
    success,
    className,
  } = props;
  const multiple = props.multiple === true;

  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-listbox`;

  const [selected, setSelected] = useControllableState<string[]>(
    props.value === undefined ? undefined : multiple ? (props.value as string[]) : props.value ? [props.value as string] : [],
    multiple ? ((props.defaultValue as string[]) ?? []) : props.defaultValue ? [props.defaultValue as string] : [],
    (next) => {
      if (multiple) (props.onValueChange as ((v: string[]) => void) | undefined)?.(next);
      else (props.onValueChange as ((v: string | null) => void) | undefined)?.(next[0] ?? null);
    },
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [listWidth, setListWidth] = useState<number>();
  const controlRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(open, 180);
  const pos = useFloatingPosition(controlRef, listRef, { open: mounted, placement: "bottom-start", offset: 6 });
  const { invalid, valid, hasMessage } = resolveStatus({ error, success, hint });

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const selectedOptions = selected.map((v) => byValue.get(v)).filter(Boolean) as ComboboxOption[];
  const singleLabel = !multiple ? (selectedOptions[0]?.label ?? "") : "";

  const filtered = useMemo(() => {
    if (onSearchChange || !query) return options;
    const q = normalize(query);
    return options.filter((o) => normalize(o.label).includes(q) || (o.description && normalize(o.description).includes(q)));
  }, [options, query, onSearchChange]);

  const showCreate =
    Boolean(onCreate) && query.trim().length > 0 && !options.some((o) => normalize(o.label) === normalize(query.trim()));
  const navigable = filtered.filter((o) => !o.disabled);
  const totalItems = navigable.length + (showCreate ? 1 : 0);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  useClickOutside([controlRef, listRef], close, open);

  const openList = () => {
    if (disabled) return;
    setListWidth(controlRef.current?.offsetWidth);
    if (!open) {
      const idx = navigable.findIndex((o) => selected.includes(o.value));
      setHighlight(Math.max(0, idx));
    }
    setOpen(true);
  };

  const choose = (option: ComboboxOption) => {
    if (option.disabled) return;
    if (multiple) {
      setSelected(selected.includes(option.value) ? selected.filter((v) => v !== option.value) : [...selected, option.value]);
      setQuery("");
      onSearchChange?.("");
      inputRef.current?.focus();
    } else {
      setSelected([option.value]);
      close();
    }
  };

  const create = () => {
    onCreate?.(query.trim());
    setQuery("");
    if (!multiple) close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return openList();
      setHighlight((h) => (totalItems ? (h + 1) % totalItems : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      setHighlight((h) => (totalItems ? (h - 1 + totalItems) % totalItems : 0));
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      if (highlight < navigable.length) choose(navigable[highlight]);
      else if (showCreate) create();
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    } else if (e.key === "Backspace" && multiple && !query && selected.length) {
      setSelected(selected.slice(0, -1));
    } else if (e.key === "Tab") {
      close();
    }
  };

  const activeOption = open ? navigable[highlight] : undefined;
  const activeId = activeOption ? `${id}-opt-${activeOption.value}` : open && showCreate && highlight === navigable.length ? `${id}-create` : undefined;

  // Agrupamento preservando a ordem
  const groups: Array<{ group?: string; items: ComboboxOption[] }> = [];
  for (const o of filtered) {
    const last = groups.at(-1);
    if (last && last.group === o.group) last.items.push(o);
    else groups.push({ group: o.group, items: [o] });
  }

  const inputValue = open || multiple ? query : singleLabel;
  const hasValue = selected.length > 0;

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      success={success}
      required={required}
      optional={optional}
      className={className}
    >
      <div
        ref={controlRef}
        className={cx(s.control, styles.control, multiple && styles.multiple)}
        data-size={size}
        data-invalid={invalid}
        data-success={valid}
        data-disabled={disabled}
        data-open={open}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          if (e.target !== inputRef.current) e.preventDefault();
          inputRef.current?.focus();
          if (open && !multiple && e.target !== inputRef.current) close();
          else openList();
        }}
      >
        {leftIcon && <span className={cx(s.adornment, s.adornmentStart)}>{leftIcon}</span>}

        {multiple &&
          selectedOptions.map((o) => (
            <span key={o.value} className={styles.chip}>
              {o.label}
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remover ${o.label}`}
                onClick={() => setSelected(selected.filter((v) => v !== o.value))}
                disabled={disabled}
              >
                <CloseIcon size={11} />
              </button>
            </span>
          ))}

        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={invalid || undefined}
          aria-describedby={hasMessage ? fieldMessageId(id) : undefined}
          aria-required={required || undefined}
          autoComplete="off"
          disabled={disabled}
          className={cx(s.input, styles.input)}
          placeholder={multiple && hasValue ? "" : open && singleLabel ? singleLabel : placeholder}
          value={inputValue}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearchChange?.(e.target.value);
            setHighlight(0);
            if (!open) openList();
          }}
          onKeyDown={onKeyDown}
        />

        {loading && (
          <span className={s.adornment}>
            <Spinner size={15} />
          </span>
        )}
        {clearable && hasValue && !disabled && (
          <button
            type="button"
            className={cx(s.inlineAction, s.clearAppear)}
            aria-label="Limpar seleção"
            tabIndex={-1}
            onClick={() => {
              setSelected([]);
              inputRef.current?.focus();
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
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className={styles.list}
            data-visible={visible}
            data-side={pos.side}
            style={{ top: pos.top, left: pos.left, width: listWidth }}
            onPointerDown={(e) => e.preventDefault()}
          >
            {groups.map((g, gi) => (
              <div key={gi} role="group" aria-label={g.group}>
                {g.group && <div className={styles.groupLabel}>{g.group}</div>}
                {g.items.map((o) => {
                  const isSelected = selected.includes(o.value);
                  const isActive = activeOption?.value === o.value;
                  return (
                    <div
                      key={o.value}
                      id={`${id}-opt-${o.value}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={o.disabled || undefined}
                      className={styles.option}
                      data-active={isActive}
                      onPointerEnter={() => {
                        const idx = navigable.indexOf(o);
                        if (idx >= 0) setHighlight(idx);
                      }}
                      onClick={() => choose(o)}
                      ref={(el) => {
                        if (isActive) el?.scrollIntoView({ block: "nearest" });
                      }}
                    >
                      {o.icon && <span className={styles.optionIcon}>{o.icon}</span>}
                      <span className={styles.optionText}>
                        <span>
                          <Highlight text={o.label} query={query} />
                        </span>
                        {o.description && <span className={styles.optionDescription}>{o.description}</span>}
                      </span>
                      <span className={styles.optionCheck} data-checked={isSelected}>
                        <CheckIcon size={15} />
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

            {showCreate && (
              <div
                id={`${id}-create`}
                role="option"
                aria-selected={false}
                className={cx(styles.option, styles.create)}
                data-active={highlight === navigable.length}
                onPointerEnter={() => setHighlight(navigable.length)}
                onClick={create}
              >
                <span className={styles.optionIcon}>+</span>
                <span className={styles.optionText}>
                  Criar “<strong>{query.trim()}</strong>”
                </span>
              </div>
            )}

            {filtered.length === 0 && !showCreate && (
              <div className={styles.empty}>{loading ? "Buscando..." : emptyText}</div>
            )}
          </div>
        </Portal>
      )}
    </Field>
  );
}
