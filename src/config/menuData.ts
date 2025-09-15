// src/config/menuData.ts
import { Home, Package, ShoppingCart, Users, Settings } from "lucide-react";
import { UserRole } from "@/types";
import { LucideIcon } from "lucide-react";

// Tipo para os itens dentro de um submenu
export type SubMenuItem = {
  href: string;
  label: string;
};

// Atualizamos o tipo principal para incluir um array opcional de sub-itens
export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  role?: UserRole;
  submenu?: SubMenuItem[]; // Propriedade para o submenu
};

export const menuData: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
  },
  // EXEMPLO DE ITEM COM SUBMENU
  {
    href: "/dashboard/anuncios", // O href principal servirá como base
    label: "Anúncios",
    icon: ShoppingCart,
    submenu: [
      {
        href: "/dashboard/anuncios",
        label: "Todos os Anúncios",
      },
    ],
  },
  {
    href: "/dashboard/empresas",
    label: "Empresas",
    icon: Package,
  },
  // EXEMPLO DE ITEM COM SUBMENU RESTRITO A ADMIN
  {
    href: "/dashboard/admin",
    label: "Administração",
    icon: Settings,
    role: UserRole.ADMIN,
    submenu: [
      {
        href: "/dashboard/admin/usuarios",
        label: "Usuários",
      },
      {
        href: "/dashboard/admin/auditoria",
        label: "Auditoria",
      },
    ],
  },
];
