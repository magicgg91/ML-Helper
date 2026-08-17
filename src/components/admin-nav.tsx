"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminRole =
  "super_admin" | "admin" | "guides_manager" | "calculators_manager";

const links: Array<{
  href: string;
  label: string;
  roles: AdminRole[] | null;
}> = [
  { href: "/admin", label: "Dashboard", roles: null },
  {
    href: "/admin/calculators",
    label: "Calculateurs",
    roles: ["super_admin", "admin", "calculators_manager"],
  },
  {
    href: "/admin/references",
    label: "Référentiels",
    roles: ["super_admin", "admin", "calculators_manager"],
  },
  {
    href: "/admin/guides",
    label: "Guides",
    roles: ["super_admin", "admin", "guides_manager"],
  },
  { href: "/admin/users", label: "Utilisateurs", roles: ["super_admin"] },
  { href: "/admin/logs", label: "Logs", roles: ["super_admin"] },
];

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  return (
    <nav className="admin-tabs tabs" aria-label="Navigation administration">
      {links
        .filter((link) => !link.roles || link.roles.includes(role as AdminRole))
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
              {link.label}
            </Link>
          );
        })}
    </nav>
  );
}
