"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, type AdminCapability } from "../auth/permissions";
import { useTranslations } from "next-intl";

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
    <nav className="admin-tabs tabs" aria-label={t("navigation-label")}>
      {links
        .filter((link) => can(role, link.capability))
        .map((link) => {
          const current =
            link.href === "/admin"
              ? pathname === link.href
              : pathname.startsWith(link.href);
          return (
            <Link
              aria-current={current ? "page" : undefined}
              href={link.href}
              key={link.href}
            >
              {t(`navigation.${link.label}`)}
            </Link>
          );
        })}
    </nav>
  );
}
