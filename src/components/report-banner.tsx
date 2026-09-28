import type { ReactNode } from "react";

/**
 * Bloc 129 §3.1 : le bandeau « Une valeur a changé en jeu ? » au bas de
 * l'accueil. Fond et bordure tendres de l'accent, un titre, une phrase, et
 * le bouton « Signaler une erreur » qu'on lui passe.
 */
export function ReportBanner({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: ReactNode;
}) {
  return (
    <section className="report-banner">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <div className="report-banner-action">{action}</div>
    </section>
  );
}
