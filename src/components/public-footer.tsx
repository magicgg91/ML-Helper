import { Link } from "@/i18n/navigation";

/**
 * Bloc 129 §2.2 : le pied de page sur quatre colonnes.
 *
 * Il ne sait ni traduire ni construire ses liens : le gabarit public lui
 * passe des colonnes déjà résolues. C'est ce qui permet à la colonne
 * « Aide » de mêler des liens ordinaires et le lien vers Contact avec son
 * objet prérempli (§2.4) sans que le pied de page ait à connaître l'un ou
 * l'autre.
 */
export type FooterLink = { href: string; label: string };
export type FooterColumn = { title: string; links: FooterLink[] };

export function PublicFooter({
  brand,
  lead,
  note,
  columns,
  copyright,
  legal,
  navLabel,
}: {
  brand: string;
  lead: string;
  note: string;
  columns: FooterColumn[];
  copyright: string;
  legal: FooterLink;
  navLabel: string;
}) {
  return (
    <footer className="public-footer">
      <div className="public-footer-grid">
        <div className="public-footer-brand-col">
          <span className="public-footer-brand">{brand}</span>
          <p className="public-footer-lead">{lead}</p>
          <p className="public-footer-note">{note}</p>
        </div>
        {columns.map((column) => (
          <nav
            className="public-footer-col"
            key={column.title}
            aria-label={column.title}
          >
            <h2 className="public-footer-col-title">{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="public-footer-bottom">
        <span>{copyright}</span>
        <nav aria-label={navLabel}>
          <Link href={legal.href}>{legal.label}</Link>
        </nav>
      </div>
    </footer>
  );
}
