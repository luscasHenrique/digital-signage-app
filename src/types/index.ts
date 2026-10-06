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

export type UserWithProfile = User &
  Partial<Pick<Profile, "full_name" | "role">>;

/* =========================
   EMPRESAS
   ========================= */

export interface Company {
  id: string;
  name: string;
  slug: string;
  is_private: boolean;
  created_at: string;
}

/** Colunas de `companies` que podem ir para o navegador (nunca inclui `password`). */
export const COMPANY_PUBLIC_COLUMNS = "id, name, slug, is_private, created_at";

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
  companies?: Company[];
}
