"use client";

import {
  BookOpenIcon,
  ExternalLinkIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  ScaleIcon,
  SettingsIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { can, type AdminCapability } from "@/auth/permissions";
import { cn } from "@/lib/utils";
import { AdminAccountMenu } from "./admin-account-menu";
import { AdminLocaleToggle } from "./admin-locale-toggle";
import { Pill } from "./admin-pill";
import { ThemeToggle } from "./theme-toggle";

/**
 * Bloc 119: the admin's navigation, moved from a row of buttons in the top
 * bar to a side column.
 *
 * The horizontal bar had no room left: eight sections, and every one of them
 * a bare word. The column gives each an icon, a place in a named group, and
 * room for the number that says how much is behind it — which is what turns
 * the navigation into a state of the site rather than a list of links.
 *
 * The entries are filtered by `can()`, the same function the server uses in
 * requireCapability: a link that appears is a page that opens. That is why
 * the role is passed down rather than the list of visible entries — one
 * source of truth, not a copy of it computed elsewhere.
 */

export type AdminSidebarCounts = {
  tools?: number;
  referentiels?: number;
  guides?: number;
  users?: number;
  /** Fields still to fill in the legal notice — the amber badge, hidden at 0. */
  legalPlaceholders?: number;
};

type NavEntryKey =
  | "dashboard"
  | "tools"
  | "referentiels"
  | "guides"
  | "content"
  | "users"
  | "logs"
  | "config";

type NavEntry = {
  key: NavEntryKey;
  href: string;
  capability: AdminCapability;
  icon: LucideIcon;
};

type NavGroup = {
  /** "main" carries no heading: the dashboard stands on its own (§2). */
  key: "main" | "content" | "access" | "site";
  entries: readonly NavEntry[];
};

const navigation: readonly NavGroup[] = [
  {
    key: "main",
    entries: [
      {
        key: "dashboard",
        href: "/admin",
        capability: "dashboard.view",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    key: "content",
    entries: [
      {
        key: "tools",
        href: "/admin/tools",
        capability: "calculators.read",
        icon: WrenchIcon,
      },
      {
        key: "referentiels",
        href: "/admin/referentiels",
        capability: "references.read",
        icon: LibraryIcon,
      },
      {
        key: "guides",
        href: "/admin/guides",
        capability: "guides.read",
        icon: BookOpenIcon,
      },
      {
        key: "content",
        href: "/admin/content",
        capability: "content.read",
        icon: ScaleIcon,
      },
    ],
  },
  {
    key: "access",
    entries: [
      {
        key: "users",
        href: "/admin/users",
        capability: "users.read",
        icon: UsersIcon,
      },
      {
        key: "logs",
        href: "/admin/logs",
        capability: "logs.view",
        icon: HistoryIcon,
      },
    ],
  },
  {
    key: "site",
    entries: [
      {
        key: "config",
        href: "/admin/config",
        capability: "configuration.read",
        icon: SettingsIcon,
      },
    ],
  },
];

/** The counter shown on an entry, or undefined when it carries none. */
function entryCount(
  key: NavEntryKey,
  counts: AdminSidebarCounts,
): number | undefined {
  if (key === "tools") return counts.tools;
  if (key === "referentiels") return counts.referentiels;
  if (key === "guides") return counts.guides;
  if (key === "users") return counts.users;
  return undefined;
}

export function AdminSidebar({
  role,
  username,
  totpEnabled,
  counts,
}: {
  role: string;
  username: string;
  totpEnabled: boolean;
  counts: AdminSidebarCounts;
}) {
  const pathname = usePathname();
  const t = useTranslations("admin");
  const roles = useTranslations("roles");
  const groupHeadingId = useId();
  const legalToDo = counts.legalPlaceholders ?? 0;

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-admin-sidebar-border bg-admin-sidebar">
      <div className="flex items-center gap-3 px-5 py-5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-admin-control bg-admin-accent font-admin-display text-sm font-semibold text-admin-on-accent"
        >
          ML
        </span>
        <div className="min-w-0">
          <p className="font-admin-display text-base font-semibold text-admin-text">
            ML-Helper
          </p>
          <p className="admin-eyebrow text-admin-dim">{t("title")}</p>
        </div>
      </div>

      <nav
        aria-label={t("navigation-label")}
        className="flex-1 overflow-y-auto px-3 pb-4"
      >
        {navigation.map((group) => {
          const entries = group.entries.filter((entry) =>
            can(role, entry.capability),
          );
          if (entries.length === 0) return null;
          const headingId = `${groupHeadingId}-${group.key}`;
          return (
            <div key={group.key} className="pt-4 first:pt-0">
              {group.key !== "main" && (
                <p
                  id={headingId}
                  className="admin-eyebrow px-3 pb-2 text-admin-dim"
                >
                  {t(`navigation.group-${group.key}`)}
                </p>
              )}
              <ul
                className="flex flex-col gap-0.5"
                aria-labelledby={group.key === "main" ? undefined : headingId}
              >
                {entries.map((entry) => {
                  // Same rule as the bar it replaces: /admin is only current
                  // on itself, every other section also covers its subpages.
                  const current =
                    entry.href === "/admin"
                      ? pathname === entry.href
                      : pathname.startsWith(entry.href);
                  const count = entryCount(entry.key, counts);
                  const Icon = entry.icon;
                  return (
                    <li key={entry.key}>
                      <Link
                        href={entry.href}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "admin-focus flex items-center gap-3 rounded-admin-control px-3 py-2 text-sm",
                          current
                            ? "bg-admin-accent-soft font-semibold text-admin-accent-soft-ink"
                            : "text-admin-dim hover:bg-admin-rule-soft hover:text-admin-text",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        <span className="flex-1 truncate">
                          {t(`navigation.${entry.key}`)}
                        </span>
                        {count !== undefined && (
                          <span className="text-xs tabular-nums text-admin-dim">
                            {count}
                          </span>
                        )}
                        {entry.key === "content" && legalToDo > 0 && (
                          <Pill tone="warn">
                            <span aria-hidden="true">{legalToDo}</span>
                            <span className="sr-only">
                              {t("navigation.legal-to-do", {
                                count: legalToDo,
                              })}
                            </span>
                          </Pill>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t border-admin-sidebar-border px-4 py-4">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-focus inline-flex items-center gap-2 text-sm text-admin-dim hover:text-admin-text"
        >
          {t("view-site")}
          <ExternalLinkIcon aria-hidden="true" className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <AdminLocaleToggle />
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 border-t border-admin-rule-soft pt-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-admin-accent-soft text-sm font-semibold text-admin-accent-soft-ink"
          >
            {username.charAt(0).toLocaleUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-admin-text">
              {username}
            </p>
            <p className="truncate text-xs text-admin-dim">{roles(role)}</p>
          </div>
        </div>
        {/* Password and two-factor settings, and the way out. Its own markup
            is unchanged by this bloc — only its place is. */}
        <AdminAccountMenu
          username={username}
          label={t("account.title")}
          totpEnabled={totpEnabled}
        />
      </div>
    </div>
  );
}
