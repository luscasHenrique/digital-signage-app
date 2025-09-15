// src/types/index.ts

import { User } from "@supabase/supabase-js";

// --- ENUMS ---
// Enums garantem a consistência dos dados em toda a aplicação.

// Enum para os tipos de usuário (NOVO)
export enum UserRole {
  ADMIN = "ADMIN",
  STANDARD = "STANDARD",
}

// Interface para a tabela 'users'
export type UserWithProfile = User &
  Partial<Pick<Profile, "full_name" | "role">>;

// Enums para os Anúncios
export enum AdvertisementType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  EMBED = "EMBED",
}

export enum AdvertisementStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum OverlayPosition {
  TOP = "TOP",
  BOTTOM = "BOTTOM",
}

// --- INTERFACES ---
// Interfaces modelam a estrutura dos nossos dados do banco.

// Interface para a tabela 'profiles' (ATUALIZADA)
// Renomeada de UserProfile para Profile para corresponder à tabela do banco.
export interface Profile {
  id: string; // Corresponde ao auth.users.id
  full_name?: string;
  avatar_url?: string;
  role: UserRole; // A nova propriedade de role/função
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  is_private: boolean;
  password?: string;
  created_at: string;
}

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  type: AdvertisementType;
  content_url: string;
  start_date: string;
  end_date: string;
  duration_seconds: number;
  status: AdvertisementStatus;
  overlay_text?: string;
  overlay_position?: OverlayPosition;
  overlay_bg_color?: string;
  overlay_text_color?: string;
  created_by?: string; // UUID do perfil que criou
  last_edited_by?: string; // UUID do perfil que editou
  created_at: string;
  updated_at: string;
  companies?: Company[]; // Relação com empresas
}

export interface AuditLog {
  id: number;
  user_id: string; // UUID do perfil que realizou a ação
  action: string;
  // CORRIGIDO: Substituído 'any' por 'unknown' para segurança de tipo.
  details: Record<string, unknown>;
  created_at: string;
}
