"use client";

import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { AdminButton } from "./admin-button";
import { AdminOverlay } from "./admin-overlay";
import { AdminSidebar, type AdminSidebarCounts } from "./admin-sidebar";

/**
 * Bloc 119: the frame every admin screen sits in — the side column, and the
 * page beside it.
 *
 * It carries the `.admin-shell` class, which is where the whole `--admin-*`
 * palette is scoped: nothing outside this element inherits a single one of
 * the refonte's tokens, so the public site keeps its own.
 *
 * Below 1024 px the column becomes a drawer. Which of the two is on screen is
 * decided in CSS (`hidden lg:flex` against `lg:hidden`) rather than by
 * measuring the viewport in JavaScript: a server render has no viewport, and
 * a hook would paint the wrong layout for the first frame on a phone.
 */
export function AdminShell({
  role,
  username,
  totpEnabled,
  counts,
  children,
}: {
  role: string;
  username: string;
  totpEnabled: boolean;
  counts: AdminSidebarCounts;
  children: ReactNode;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const drawerTitleId = useId();
  // The drawer is bound to the route it was opened on, rather than to a
  // boolean an effect resets: following one of its links navigates behind it,
  // and it has to be gone when the new page paints. Derived this way it
  // closes itself, with no effect writing state after the render.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const drawerOpen = openedFor === pathname;
  const closeDrawer = () => setOpenedFor(null);

  const sidebar = (
    <AdminSidebar
      role={role}
      username={username}
      totpEnabled={totpEnabled}
      counts={counts}
    />
  );

  return (
    <div className="admin-shell flex min-h-screen bg-admin-page text-[14px] text-admin-text">
      <div className="hidden lg:flex">{sidebar}</div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-admin-sidebar-border bg-admin-sidebar px-4 py-3 lg:hidden">
          <AdminButton
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("open-menu")}
            aria-expanded={drawerOpen}
            onClick={() => setOpenedFor(pathname)}
          >
            <MenuIcon aria-hidden="true" />
          </AdminButton>
          <span className="font-admin-display font-semibold">ML-Helper</span>
        </div>
        <main className="flex-1 p-[var(--admin-page-pad)] xl:p-[var(--admin-page-pad-lg)]">
          {children}
        </main>
      </div>
      <AdminOverlay
        open={drawerOpen}
        onClose={closeDrawer}
        labelledBy={drawerTitleId}
        placement="left"
        className="h-full max-w-[85vw]"
      >
        <h2 id={drawerTitleId} className="sr-only">
          {t("navigation-label")}
        </h2>
        {sidebar}
      </AdminOverlay>
    </div>
  );
}
