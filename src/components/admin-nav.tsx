"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, type AdminCapability } from "../auth/permissions";

const links: Array<{
  href: string;
  label: string;
  capability: AdminCapability;
}> = [
  { href: "/admin", label: "Dashboard", capability: "dashboard.view" },
  {
    href: "/admin/calculators",
    label: "Calculateurs",
    capability: "calculators.read",
  },
  {
    href: "/admin/references",
    label: "Référentiels",
    capability: "references.read",
  },
  {
    href: "/admin/guides",
    label: "Guides",
    capability: "guides.read",
  },
  {
    href: "/admin/content",
    label: "Contenu statique",
    capability: "content.read",
  },
  { href: "/admin/users", label: "Utilisateurs", capability: "users.manage" },
  { href: "/admin/logs", label: "Logs", capability: "logs.view" },
];

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  return (
    <nav className="admin-tabs tabs" aria-label="Navigation administration">
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
              {link.label}
            </Link>
          );
        })}
    </nav>
  );
}
