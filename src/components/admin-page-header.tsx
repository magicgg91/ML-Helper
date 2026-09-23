import type { ReactNode } from "react";

/**
 * Bloc 119: the top of every admin screen — eyebrow, h1, one line of
 * explanation, and the screen's own actions on the right.
 *
 * Not a client component: the list pages are server components, and their
 * header holds no state. What goes in `actions` brings its own boundary when
 * it needs one.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  /** The section this screen belongs to — "Contenu", "Accès". */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="admin-eyebrow text-admin-dim">{eyebrow}</p>}
        <h1 className="admin-title mt-1 text-admin-text">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-admin-dim">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
