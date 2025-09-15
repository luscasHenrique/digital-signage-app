// src/components/admin/SidebarNav.tsx
"use client";

import { menuData } from "@/config/menuData";
import { UserRole } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

interface SidebarNavProps {
  userRole: UserRole;
}

export function SidebarNav({ userRole }: SidebarNavProps) {
  const pathname = usePathname();

  const filteredMenu = menuData.filter(
    (item) => !item.role || item.role === userRole
  );

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {filteredMenu.map((item) =>
        item.submenu ? (
          // Se o item tiver um submenu, renderiza um Collapsible
          <Collapsible key={item.href} className="flex flex-col gap-1">
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&[data-state=open]>svg]:rotate-90">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-8">
              <div className="grid gap-1">
                {item.submenu.map((subItem) => {
                  const isSubActive = pathname === subItem.href;
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      // CORREÇÃO APLICADA AQUI
                      className={`block rounded-md px-3 py-2 text-sm transition-all hover:text-primary ${
                        isSubActive
                          ? "bg-muted text-primary"
                          : "text-muted-foreground"
                      }`}
                      aria-current={isSubActive ? "page" : undefined}
                    >
                      {subItem.label}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          // Se não tiver submenu, renderiza um link simples
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              pathname === item.href
                ? "bg-muted text-primary"
                : "text-muted-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}
