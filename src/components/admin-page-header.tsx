import type { ReactNode } from "react";

/**
 * Bloc 119: the top of every admin screen — eyebrow, h1, and the screen's
 * own actions on the right.
 *
 * Not a client component: the list pages are server components, and their
 * header holds no state. What goes in `actions` brings its own boundary when
 * it needs one.
 *
 * Bloc 131/D, puis le correctif qui l'a étendu à Mon compte : plus de ligne
 * d'explication sous le titre. Elle redisait ce que l'écran montre déjà, et
 * le prop part avec elle — le dernier appelant était Mon compte, resté de
 * côté parce qu'il n'est ni une page de liste ni un écran d'édition.
 */
export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  /** The section this screen belongs to — "Contenu", "Accès". */
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="admin-eyebrow text-admin-dim">{eyebrow}</p>}
        <h1 className="admin-title mt-1 text-admin-text">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
