// src/components/admin/AdminShell.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { LogOut, MonitorPlay } from "lucide-react";
import { logout } from "@/actions/auth";
import { findActiveMenuId, menuData, type MenuItem } from "@/config/menuData";
import { MobileMenu } from "@/components/ui/MobileMenu/MobileMenu";
import {
  Sidebar,
  type SidebarItem,
  type SidebarLinkProps,
  type SidebarSection,
} from "@/components/ui/Sidebar/Sidebar";
import { ThemeToggle } from "@/components/ui/Theme/ThemeToggle";
import { useToast } from "@/components/ui/Toast/Toast";
import { UserRole } from "@/types";
import styles from "./AdminShell.module.css";

interface AdminShellProps {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  children: ReactNode;
}

function toSidebarItems(items: MenuItem[], role: UserRole): SidebarItem[] {
  return items
    .filter((item) => !item.role || item.role === role)
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon ? <item.icon /> : undefined,
      children: item.children ? toSidebarItems(item.children, role) : undefined,
    }));
}

const renderLink = ({ href, children, ...props }: SidebarLinkProps) => (
  <Link href={href} {...props}>
    {children}
  </Link>
);

const brand = {
  logo: (
    <span className={styles.logo}>
      <MonitorPlay size={18} />
    </span>
  ),
  title: "Digital Signage",
};

export function AdminShell({
  userRole,
  userName,
  userEmail,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const sections = useMemo<SidebarSection[]>(
    () => [{ id: "main", items: toSidebarItems(menuData, userRole) }],
    [userRole]
  );
  const activeId = findActiveMenuId(menuData, pathname);

  const footerSections = useMemo<SidebarSection[]>(
    () => [
      {
        id: "account",
        items: [
          {
            id: "logout",
            label: "Sair",
            icon: <LogOut />,
            onClick: async () => {
              const result = await logout();
              if (result.success) {
                toast.info(result.message);
                router.push("/login");
              } else {
                toast.error(result.message);
              }
            },
          },
        ],
      },
    ],
    [router, toast]
  );

  const user = {
    name: userName,
    subtitle: userRole === UserRole.ADMIN ? "Administrador" : userEmail,
  };

  return (
    <div className={styles.layout}>
      <div className={styles.sidebarWrap}>
        <Sidebar
          brand={brand}
          user={user}
          sections={sections}
          footerSections={footerSections}
          activeId={activeId}
          renderLink={renderLink}
        />
      </div>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.mobileOnly}>
            <MobileMenu
              brand={brand}
              user={user}
              sections={sections}
              footerSections={footerSections}
              activeId={activeId}
              renderLink={renderLink}
              placement="left"
            />
          </div>
          <div className={styles.spacer} />
          <ThemeToggle />
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
