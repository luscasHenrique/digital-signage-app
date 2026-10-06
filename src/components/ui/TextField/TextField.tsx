"use client";

import { useId, useRef, useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { mergeRefs, setNativeValue } from "../_internal/dom";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  SearchIcon,
} from "../_internal/icons";
import { Field, fieldMessageId, fieldStyles as s, resolveStatus, type FieldStatusProps } from "../Field/Field";
import { Spinner } from "../Spinner/Spinner";

export type TextFieldProps = Omit<ComponentProps<"input">, "size"> &
  FieldStatusProps & {
    label?: ReactNode;
    size?: "sm" | "md" | "lg";
    /** Ícone/elemento à esquerda */
    leftIcon?: ReactNode;
    /** Ícone/elemento à direita */
    rightIcon?: ReactNode;
    /** Mostra botão "x" para limpar quando há valor. Padrão: true em type="search". */
    clearable?: boolean;
    onClear?: () => void;
    /** Mostra spinner à direita (ex.: validação assíncrona) */
    loading?: boolean;
    /** Em type="password", mostra o botão de revelar senha. Padrão: true */
    revealable?: boolean;
    /** Exibe "(opcional)" no label */
    optional?: boolean;
    /** Conteúdo à direita do label */
    labelAction?: ReactNode;
    /** Mostra contador de caracteres (usa maxLength se houver) */
    showCount?: boolean;
    /** Classe do wrapper externo (Field) */
    containerClassName?: string;
  };

export function TextField({
  label,
  hint,
  error,
  success,
  size = "md",
  leftIcon,
  rightIcon,
  clearable,
  onClear,
  loading,
  revealable = true,
  optional,
  labelAction,
  showCount,
  containerClassName,
  className,
  id: idProp,
  type = "text",
  disabled,
  required,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  maxLength,
  ref,
  ...props
}: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [innerValue, setInnerValue] = useState(String(defaultValue ?? ""));

  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value ?? "") : innerValue;
  const hasValue = currentValue.length > 0;

  const isPassword = type === "password";
  const isSearch = type === "search";
  const showClear = (clearable ?? isSearch) && hasValue && !disabled && !props.readOnly;
  const { invalid, valid, hasMessage } = resolveStatus({ error, success, hint });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInnerValue(event.target.value);
    onChange?.(event);
  };

  const clear = () => {
    if (inputRef.current) {
      setNativeValue(inputRef.current, "");
      inputRef.current.focus();
    }
    onClear?.();
  };

  const start = leftIcon ?? (isSearch ? <SearchIcon /> : null);

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      success={success}
      required={required}
      optional={optional}
      labelAction={labelAction}
      className={containerClassName}
      meta={
        showCount ? (
          <span>
            {currentValue.length}
            {maxLength ? `/${maxLength}` : ""}
          </span>
        ) : undefined
      }
    >
      <div
        className={cx(s.control, className)}
        data-size={size}
        data-invalid={invalid}
        data-success={valid}
        data-disabled={disabled}
        onPointerDown={(e) => {
          // Clicar em qualquer lugar da casca foca o input
          if (e.target === e.currentTarget) {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        {start && <span className={cx(s.adornment, s.adornmentStart)}>{start}</span>}

        <input
          ref={mergeRefs(ref, inputRef)}
          id={id}
          type={isPassword && revealed ? "text" : type}
          className={s.input}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          aria-invalid={invalid || undefined}
          aria-describedby={hasMessage ? fieldMessageId(id) : undefined}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (isSearch && e.key === "Escape" && hasValue) {
              e.preventDefault();
              clear();
            }
            onKeyDown?.(e);
          }}
          {...props}
        />

        {loading && (
          <span className={s.adornment}>
            <Spinner size={16} />
          </span>
        )}

        {showClear && (
          <button
            type="button"
            className={cx(s.inlineAction, s.clearAppear)}
            onClick={clear}
            aria-label="Limpar campo"
            tabIndex={-1}
          >
            <CloseIcon size={14} />
          </button>
        )}

        {isPassword && revealable && (
          <button
            type="button"
            className={s.inlineAction}
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={revealed}
            disabled={disabled}
          >
            {revealed ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        )}

        {!loading && invalid && (
          <span className={s.statusIcon} data-tone="danger">
            <AlertCircleIcon size={17} />
          </span>
        )}
        {!loading && valid && (
          <span className={s.statusIcon} data-tone="success">
            <CheckCircleIcon size={17} />
          </span>
        )}

        {rightIcon && <span className={s.adornment}>{rightIcon}</span>}
      </div>
    </Field>
  );
}
