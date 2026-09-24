import type { ReactNode } from "react";

/**
 * Bloc 119: one section of the Configuration screen.
 *
 * It replaces the collapsible block of Bloc 100/C. Folding made sense while
 * the sections were stacked full-width; in two columns — what it is on the
 * left, what it does on the right — everything is readable at once, and
 * there is nothing left to fold away.
 *
 * Server component: a section holds no state of its own, only the panel
 * inside it does.
 */
export function AdminSettingsSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  /** Shown next to the title — a status pill, for instance. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-admin-card border border-admin-card-border bg-admin-card p-6 lg:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[300px]">
        <h2 className="admin-section-title">{title}</h2>
        {description && <p className="text-sm text-admin-dim">{description}</p>}
        {actions}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
