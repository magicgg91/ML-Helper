"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type PublicNavLink = { href: string; label: string };

export function PublicNav({
  links,
  navLabel,
  menuLabel,
}: {
  links: PublicNavLink[];
  navLabel: string;
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="public-nav">
      <button
        type="button"
        className="public-nav-toggle"
        aria-label={menuLabel}
        aria-expanded={open}
        aria-controls="public-nav-links"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "✕" : "☰"}</span>
      </button>
      <nav
        id="public-nav-links"
        className="public-header-nav"
        aria-label={navLabel}
        data-open={open}
      >
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
