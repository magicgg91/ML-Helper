"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, type AdminCapability } from "../auth/permissions";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links: Array<{
  href: string;
  label:
    | "dashboard"
    | "tools"
    | "referentiels"
    | "guides"
    | "content"
    | "users"
    | "logs";
  capability: AdminCapability;
}> = [
  { href: "/admin", label: "dashboard", capability: "dashboard.view" },
  {
    href: "/admin/tools",
    label: "tools",
    capability: "calculators.read",
  },
  {
    href: "/admin/referentiels",
    label: "referentiels",
    capability: "references.read",
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
    <nav
      aria-label={t("navigation-label")}
      className="flex flex-wrap items-center gap-1"
    >
      {links
        .filter((link) => can(role, link.capability))
        .map((link) => {
          const current =
            link.href === "/admin"
              ? pathname === link.href
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              aria-current={current ? "page" : undefined}
              href={link.href}
              className={cn(
                buttonVariants({
                  variant: current ? "secondary" : "ghost",
                  size: "sm",
                }),
              )}
            >
              {t(`navigation.${link.label}`)}
            </Link>
          );
        })}
    </nav>
  );
}
