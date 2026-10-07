// src/types/index.ts

import { User } from "@supabase/supabase-js";

/* =========================
   ENUMS
   ========================= */

export enum UserRole {
  ADMIN = "ADMIN",
  STANDARD = "STANDARD",
}

export enum AdvertisementType {
  IMAGE_UPLOAD = "IMAGE_UPLOAD",
  VIDEO_UPLOAD = "VIDEO_UPLOAD",
  IMAGE_LINK = "IMAGE_LINK",
  VIDEO_LINK = "VIDEO_LINK",
  EMBED_LINK = "EMBED_LINK",
}

export enum AdvertisementStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum OverlayPosition {
  TOP = "TOP",
  BOTTOM = "BOTTOM",
}

/* =========================
   PERFIL / USUÁRIO
   ========================= */

export interface Profile {
  id: string; // corresponde a auth.users.id
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
}

/** Usuário como aparece no painel: só os campos que a tela usa. */
export type UserWithProfile = Pick<User, "id" | "email" | "created_at"> &
  Partial<Pick<Profile, "full_name" | "role">>;

/* =========================
   EMPRESAS
   ========================= */

export interface Company {
  id: string;
  name: string;
  slug: string;
  is_private: boolean;
  /** Animação de troca entre anúncios no display */
  transition: DisplayTransition;
  created_at: string;
}

export const DISPLAY_TRANSITIONS = ["fade", "slideFromRight", "zoomIn"] as const;
export type DisplayTransition = (typeof DISPLAY_TRANSITIONS)[number];

/** Empresa com o último contato do display (status da TV no painel). */
export type CompanyWithStatus = Company & {
  heartbeat: { last_seen_at: string } | null;
};

/** Colunas de `companies` que podem ir para o navegador (nunca inclui `password`). */
export const COMPANY_PUBLIC_COLUMNS =
  "id, name, slug, is_private, transition, created_at";

/* =========================
   ANÚNCIOS
   ========================= */

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  type: AdvertisementType;
  content_url: string;
  thumbnail_url?: string;
  start_date: string;
  end_date: string;
  duration_seconds: number;
  status: AdvertisementStatus;
  overlay_text?: string;
  overlay_position?: OverlayPosition;
  overlay_bg_color?: string;
  overlay_text_color?: string;
  created_by?: string;
  last_edited_by?: string;
  created_at: string;
  updated_at: string;
  /** Ordem no display (menor primeiro; empate = mais recente primeiro) */
  position: number;
  /** 0 = domingo ... 6 = sábado; null = todos os dias */
  weekdays?: number[] | null;
  /** Faixa diária "HH:MM:SS" no horário de Brasília; null = o dia todo */
  daily_start?: string | null;
  daily_end?: string | null;
  companies?: Company[];
}

/** Colunas que o player do display usa (evita trafegar o anúncio inteiro). */
export const DISPLAY_AD_COLUMNS =
  "id, title, type, content_url, duration_seconds, overlay_text, overlay_position, overlay_bg_color, overlay_text_color, start_date, end_date, weekdays, daily_start, daily_end";

export type DisplayAd = Pick<
  Advertisement,
  | "id"
  | "title"
  | "type"
  | "content_url"
  | "duration_seconds"
  | "overlay_text"
  | "overlay_position"
  | "overlay_bg_color"
  | "overlay_text_color"
  // O player também confere período e programação: a lista pode ficar em
  // cache (offline) ou passar da hora entre uma atualização e outra
  | "start_date"
  | "end_date"
  | "weekdays"
  | "daily_start"
  | "daily_end"
>;

/** Anúncio no diálogo "Ordem" (lista completa, só o que a linha mostra). */
export type OrderListAd = Pick<
  Advertisement,
  | "id"
  | "title"
  | "type"
  | "content_url"
  | "thumbnail_url"
  | "status"
  | "start_date"
  | "end_date"
  | "weekdays"
  | "daily_start"
  | "daily_end"
>;

/** Anúncio com as empresas vinculadas (resultado do join M:N). */
export type AdvertisementWithCompanies = Advertisement & {
  companies: Company[];
};
