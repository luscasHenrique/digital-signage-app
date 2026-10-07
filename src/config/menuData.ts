// src/config/menuData.ts
import {
  BarChart3,
  Building2,
  Home,
  Megaphone,
  Settings,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { UserRole } from "@/types";

export type MenuItem = {
  id: string;
  href?: string;
  label: string;
  icon?: LucideIcon;
  /** Só aparece para este papel */
  role?: UserRole;
  children?: MenuItem[];
};

export const menuData: MenuItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: Home },
  {
    id: "anuncios",
    href: "/dashboard/anuncios",
    label: "Anúncios",
    icon: Megaphone,
  },
  {
    id: "empresas",
    href: "/dashboard/empresas",
    label: "Empresas",
    icon: Building2,
  },
  {
    id: "relatorios",
    href: "/dashboard/relatorios",
    label: "Relatórios",
    icon: BarChart3,
  },
  {
    id: "admin",
    label: "Administração",
    icon: Settings,
    role: UserRole.ADMIN,
    children: [
      { id: "usuarios", href: "/dashboard/admin/usuarios", label: "Usuários" },
      {
        id: "auditoria",
        href: "/dashboard/admin/auditoria",
        label: "Auditoria",
      },
    ],
  },
  { id: "conta", href: "/dashboard/conta", label: "Minha conta", icon: UserRound },
];

/** Item de menu mais específico que corresponde à rota atual. */
export function findActiveMenuId(
  items: MenuItem[],
  pathname: string
): string | undefined {
  let best: { id: string; length: number } | undefined;

  const visit = (list: MenuItem[]) => {
    for (const item of list) {
      if (
        item.href &&
        (pathname === item.href || pathname.startsWith(`${item.href}/`)) &&
        item.href.length > (best?.length ?? -1)
      ) {
        best = { id: item.id, length: item.href.length };
      }
      if (item.children) visit(item.children);
    }
  };
  visit(items);

  return best?.id;
}
