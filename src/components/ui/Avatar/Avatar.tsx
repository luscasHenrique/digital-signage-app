"use client";

import { useState, type CSSProperties } from "react";
import { cx } from "../_internal/cx";
import styles from "./Avatar.module.css";

export type AvatarProps = {
  src?: string;
  name?: string;
  size?: number;
  /** Indicador de presença */
  status?: "online" | "away" | "busy" | "offline";
  className?: string;
};

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

/** Gera um matiz estável a partir do nome, para o fallback colorido. */
function hue(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ src, name, size = 40, status, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span
      className={cx(styles.avatar, className)}
      style={{ width: size, height: size, fontSize: size * 0.38, "--avatar-hue": hue(name) } as CSSProperties}
      role="img"
      aria-label={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={styles.image} onError={() => setFailed(true)} />
      ) : (
        <span className={styles.fallback} aria-hidden="true">
          {initials(name)}
        </span>
      )}
      {status && <span className={styles.status} data-status={status} />}
    </span>
  );
}
