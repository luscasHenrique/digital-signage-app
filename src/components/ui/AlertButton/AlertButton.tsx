"use client";

import { useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { Badge } from "../Badge/Badge";
import { cx } from "../_internal/cx";
import { useControllableState } from "../_internal/hooks";
import { BellIcon, StarIcon, VolumeIcon } from "../_internal/icons";
import styles from "./AlertButton.module.css";

export type AlertButtonProps = Omit<ComponentProps<"button">, "color" | "children"> & {
  /** Nome do botão (ex.: "Sala 01") */
  name: string;
  /** Cor base do círculo — qualquer cor CSS escolhida na criação (ex.: "#4F46E5") */
  color: string;
  /** Etiqueta da categoria (ex.: "Geral") */
  category?: ReactNode;
  /** Nome do som configurado (ex.: "Alerta padrão") */
  sound?: ReactNode;
  /** Ícone dentro do círculo. Padrão: sino */
  icon?: ReactNode;
  /**
   * Disparo do alerta. Se retornar uma Promise (ex.: o som tocando),
   * o botão fica no estado "tocando" até ela terminar.
   */
  onTrigger?: () => void | Promise<unknown>;
  /** Força o estado "tocando" (sino balançando + ondas) */
  ringing?: boolean;

  favorite?: boolean;
  defaultFavorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  /** Mostra a estrela de favoritar. Padrão: true */
  showFavorite?: boolean;
  favoriteLabel?: string;
  unfavoriteLabel?: string;

  size?: "sm" | "md" | "lg";
  /** Classe do card (wrapper). As demais props vão para o botão principal. */
  className?: string;
};

/** Cor do ícone legível sobre a cor base: escuro em cores claras (amarelo, ciano...) */
function prefersDarkIcon(color: string) {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) return false;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.45;
}

/**
 * Botão de alerta em formato de card: círculo na cor escolhida com brilho,
 * nome, categoria e som. Tocar dispara uma onda; enquanto o alerta toca, o
 * sino balança. A estrela favorita o item sem disparar o alerta.
 */
export function AlertButton({
  name,
  color,
  category,
  sound,
  icon,
  onTrigger,
  ringing: ringingProp,
  favorite: favoriteProp,
  defaultFavorite = false,
  onFavoriteChange,
  showFavorite = true,
  favoriteLabel = "Favoritar",
  unfavoriteLabel = "Remover dos favoritos",
  size = "md",
  disabled,
  className,
  onClick,
  ...props
}: AlertButtonProps) {
  const [favorite, setFavorite] = useControllableState(favoriteProp, defaultFavorite, onFavoriteChange);
  const [pending, setPending] = useState(false);
  const [waves, setWaves] = useState<number[]>([]);
  const ringing = ringingProp ?? pending;

  const trigger = async () => {
    setWaves((w) => [...w, Date.now()]);
    const result = onTrigger?.();
    if (result instanceof Promise) {
      setPending(true);
      try {
        await result;
      } finally {
        setPending(false);
      }
    }
  };

  return (
    <div
      className={cx(styles.card, className)}
      data-size={size}
      data-ringing={ringing}
      data-disabled={disabled}
      data-dark-icon={prefersDarkIcon(color)}
      style={{ "--alert-color": color } as CSSProperties}
    >
      <button
        type="button"
        className={styles.main}
        disabled={disabled}
        aria-busy={ringing || undefined}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) trigger();
        }}
        {...props}
      >
        <span className={styles.circle} aria-hidden="true">
          {waves.map((id) => (
            <span
              key={id}
              className={styles.wave}
              onAnimationEnd={() => setWaves((w) => w.filter((x) => x !== id))}
            />
          ))}
          <span className={styles.pulse} />
          <span className={styles.icon}>{icon ?? <BellIcon />}</span>
        </span>

        <span className={styles.name}>{name}</span>
        {category && (
          <Badge className={styles.category}>{category}</Badge>
        )}
        {sound && (
          <span className={styles.sound}>
            <VolumeIcon size={14} />
            <span>{sound}</span>
          </span>
        )}
      </button>

      {showFavorite && (
        <button
          type="button"
          className={styles.star}
          data-active={favorite}
          aria-pressed={favorite}
          aria-label={`${favorite ? unfavoriteLabel : favoriteLabel}: ${name}`}
          onClick={() => setFavorite(!favorite)}
        >
          <StarIcon size={20} />
        </button>
      )}
    </div>
  );
}
