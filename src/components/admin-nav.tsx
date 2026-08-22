"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, type AdminCapability } from "../auth/permissions";
import { useTranslations } from "next-intl";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const links: Array<{
  href: string;
  label: "dashboard" | "tools" | "guides" | "content" | "users" | "logs";
  capability: AdminCapability;
}> = [
  { href: "/admin", label: "dashboard", capability: "dashboard.view" },
  {
    href: "/admin/tools",
    label: "tools",
    capability: "calculators.read",
  },
  {
    href: "/admin/guides",
    label: "guides",
    capability: "guides.read",
  },
  {
    href: "/admin/content",
    label: "content",
    capability: "content.read",
  },
  { href: "/admin/users", label: "users", capability: "users.read" },
  { href: "/admin/logs", label: "logs", capability: "logs.view" },
];

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const t = useTranslations("admin");
  return (
    <SidebarContent>
      <SidebarMenu>
        {links
          .filter((link) => can(role, link.capability))
          .map((link) => {
            const current =
              link.href === "/admin"
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton asChild isActive={current}>
                  <Link
                    aria-current={current ? "page" : undefined}
                    href={link.href}
                  >
                    {t(`navigation.${link.label}`)}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
      </SidebarMenu>
    </SidebarContent>
  );
}
