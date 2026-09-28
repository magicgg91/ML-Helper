import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Bloc 131/A : la puce d'une langue — pleine quand la version existe, en
 * pointillés quand elle reste à écrire.
 *
 * Le Bloc 119 avait dessiné ces puces dans la colonne Traductions de la liste
 * des Guides, directement dans le corps du composant. Le Bloc 131 les demande
 * aussi sur la description d'un outil ou d'un référentiel, à la place du
 * résumé « aucune langue » / « 3 langues » : un compte dit combien il en
 * manque, jamais lesquelles, et c'est la question qu'on se pose devant la
 * colonne. Deux copies d'une même puce divergeraient à la première retouche,
 * d'où ce composant plutôt qu'un second jeu de classes.
 *
 * Le libellé n'est pas décoratif : la puce ne montre qu'un code de langue, et
 * c'est le trait plein ou pointillé qui porte l'information. Lue à voix
 * haute, une rangée de puces dirait « fr en de es tr » sans rien dire de ce
 * qu'elle compte. La phrase entière est donc portée par la puce — en
 * `aria-label` quand elle est un lien, en texte masqué quand elle n'en est
 * pas un, parce qu'un `aria-label` sur un <span> sans rôle n'est pas exposé
 * de façon fiable. L'infobulle reste, pour la souris.
 */
export function LocaleChip({
  code,
  written,
  href,
  label,
}: {
  /** Le code affiché : `fr`, `en`… */
  code: string;
  /** Vrai si cette langue est rédigée ; sinon la puce est en pointillés. */
  written: boolean;
  /** Où mène la puce, quand elle mène quelque part. */
  href?: string;
  /** La phrase entière : « Deutsch : pas encore traduit ». */
  label: string;
}) {
  const className = cn(
    "inline-flex h-[var(--admin-pill-h)] items-center rounded-full px-2 font-admin-mono text-[11px] font-semibold uppercase",
    written
      ? "bg-admin-accent-soft text-admin-accent-soft-ink"
      : "border border-dashed border-admin-card-border text-admin-dim",
  );
  if (href !== undefined)
    return (
      <Link
        href={href}
        aria-label={label}
        className={cn("admin-focus", className)}
      >
        {code}
      </Link>
    );
  return (
    <span className={className} title={label}>
      <span aria-hidden="true">{code}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
