import type { ReactNode } from "react";

/**
 * Bloc 129 §2 : l'en-tête standard d'une page — le H1, sa description d'une
 * ligne, et une action à droite (en pratique « Signaler une erreur »).
 *
 * `description` est un ReactNode et non une chaîne : sur les gabarits outil
 * et référentiel elle vient de `calculators.description` en base, et peut
 * être absente. Dans ce cas la ligne n'est pas rendue du tout — le §5 du
 * brief demande de masquer, pas d'afficher un vide.
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`page-header${className ? ` ${className}` : ""}`}>
      <div className="page-header-copy">
        <h1>{title}</h1>
        {description ? <p className="page-header-lead">{description}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </header>
  );
}
