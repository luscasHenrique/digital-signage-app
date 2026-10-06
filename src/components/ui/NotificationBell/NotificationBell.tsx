"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "../Avatar/Avatar";
import { formatCount } from "../Badge/Badge";
import { cx } from "../_internal/cx";
import { AlertCircleIcon, BellIcon, CheckCircleIcon, CheckIcon, InfoIcon, WarningIcon } from "../_internal/icons";
import { Popover } from "../Popover/Popover";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import type { Placement } from "../_internal/hooks";
import styles from "./NotificationBell.module.css";

export type NotificationItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Date, timestamp ISO ou texto pronto ("há 5 min") */
  time?: Date | string;
  read?: boolean;
  /** Ícone personalizado (sobrepõe tone) */
  icon?: ReactNode;
  /** Mostra avatar no lugar do ícone */
  avatar?: { src?: string; name: string };
  tone?: "info" | "success" | "warning" | "danger";
};

export type NotificationBellProps = {
  notifications: NotificationItem[];
  onItemClick?: (item: NotificationItem) => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onViewAll?: () => void;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  placement?: Placement;
  width?: number;
  /** Tamanho do botão do sino */
  size?: "sm" | "md";
  /** Remove o fundo de vidro do botão */
  bare?: boolean;
  className?: string;
};

const toneIcon = {
  info: <InfoIcon size={16} />,
  success: <CheckCircleIcon size={16} />,
  warning: <WarningIcon size={16} />,
  danger: <AlertCircleIcon size={16} />,
};

const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" }) : null;

export function formatRelativeTime(time?: Date | string) {
  if (!time) return "";
  const date = typeof time === "string" ? new Date(time) : time;
  if (Number.isNaN(date.getTime())) return String(time);
  const diff = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "agora";
  if (!rtf) return date.toLocaleString();
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), "day");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function NotificationBell({
  notifications,
  onItemClick,
  onMarkRead,
  onMarkAllRead,
  onViewAll,
  title = "Notificações",
  emptyTitle = "Tudo em dia",
  emptyDescription = "Você não tem novas notificações.",
  placement = "bottom-end",
  width = 380,
  size = "md",
  bare = false,
  className,
}: NotificationBellProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = notifications.filter((n) => !n.read).length;
  const count = formatCount(unread);
  const list = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  // Balança o sino quando chegam novas notificações
  const prevUnread = useRef(unread);
  const [ringKey, setRingKey] = useState(0);
  useEffect(() => {
    if (unread > prevUnread.current) setRingKey((k) => k + 1);
    prevUnread.current = unread;
  }, [unread]);

  return (
    <Popover
      placement={placement}
      width={width}
      label={title}
      className={styles.panel}
      trigger={(props) => (
        <button
          {...props}
          type="button"
          className={cx(styles.bell, bare && styles.bare, className)}
          data-size={size}
          aria-label={unread ? `${title}: ${unread} não lidas` : title}
        >
          <span key={ringKey} className={cx(styles.bellIcon, ringKey > 0 && styles.ring)}>
            <BellIcon size={size === "sm" ? 17 : 19} />
          </span>
          {count && (
            <span key={`c-${count}`} className={styles.count}>
              {count}
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <h2 className={styles.title}>
                {title}
                {unread > 0 && <span className={styles.titleCount}>{unread}</span>}
              </h2>
              {onMarkAllRead && unread > 0 && (
                <button type="button" className={styles.link} onClick={onMarkAllRead}>
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <SegmentedControl
              size="sm"
              fullWidth
              ariaLabel="Filtrar notificações"
              value={filter}
              onValueChange={(v) => setFilter(v as "all" | "unread")}
              items={[
                { value: "all", label: "Todas" },
                { value: "unread", label: unread ? `Não lidas (${unread})` : "Não lidas" },
              ]}
            />
          </header>

          {list.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <CheckIcon size={22} />
              </span>
              <p className={styles.emptyTitle}>{emptyTitle}</p>
              <p className={styles.emptyDescription}>{emptyDescription}</p>
            </div>
          ) : (
            <ul role="list" className={styles.list}>
              {list.map((n, index) => (
                <li key={n.id} className={styles.li} style={{ animationDelay: `${index * 30}ms` }}>
                  <button
                    type="button"
                    className={styles.item}
                    data-unread={!n.read}
                    onClick={() => {
                      onItemClick?.(n);
                      if (!n.read) onMarkRead?.(n.id);
                    }}
                  >
                    <span className={styles.itemMedia} data-tone={n.tone ?? "info"}>
                      {n.avatar ? (
                        <Avatar src={n.avatar.src} name={n.avatar.name} size={36} />
                      ) : (
                        (n.icon ?? toneIcon[n.tone ?? "info"])
                      )}
                    </span>
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>{n.title}</span>
                      {n.description && <span className={styles.itemDescription}>{n.description}</span>}
                      {n.time && <span className={styles.itemTime}>{formatRelativeTime(n.time)}</span>}
                    </span>
                    {!n.read && <span className={styles.unreadDot} aria-label="Não lida" />}
                  </button>
                  {!n.read && onMarkRead && (
                    <button
                      type="button"
                      className={styles.markRead}
                      onClick={() => onMarkRead(n.id)}
                      aria-label="Marcar como lida"
                      title="Marcar como lida"
                    >
                      <CheckIcon size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {onViewAll && (
            <footer className={styles.footer}>
              <button
                type="button"
                className={styles.viewAll}
                onClick={() => {
                  onViewAll();
                  close();
                }}
              >
                Ver todas as notificações
              </button>
            </footer>
          )}
        </div>
      )}
    </Popover>
  );
}
