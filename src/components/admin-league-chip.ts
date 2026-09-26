import { cn } from "@/lib/utils";

/**
 * Bloc 138/C — le style d'un bouton de sélection de ligue, côté admin.
 *
 * Il vient de l'écran Événements, qui le portait le premier, et c'est celui de
 * tous les choix de l'admin : le jeton d'accent doux et son encre appariée, les
 * mêmes que les onglets de langue et les filtres.
 *
 * Le Classement en portait un autre depuis le Bloc 137 : `bg-admin-accent`, le
 * violet plein, avec `text-admin-accent-ink` — un nom de jeton qui **n'existe
 * pas**. La classe n'était donc pas engendrée, le texte gardait la couleur
 * héritée, et le bouton actif tombait à 1,94:1 en thème clair, sous le minimum
 * de 4,5:1 du WCAG 1.4.3. D'où une fonction plutôt qu'une paire de chaînes
 * recopiées : un seul endroit décide de ce style, et les deux écrans rendent la
 * même classe au caractère près.
 *
 * `inline-flex` y est pour que le Classement puisse y poser sa pastille d'état
 * sans ajouter de classe à lui — sans quoi les deux écrans divergeraient de
 * nouveau, par la petite porte.
 */
export function adminLeagueChipClass(selected: boolean): string {
  return cn(
    "admin-focus inline-flex h-[var(--admin-control-h-sm)] items-center gap-2 rounded-admin-control border px-3 text-sm font-semibold",
    selected
      ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
      : "border-admin-card-border text-admin-dim hover:text-admin-text",
  );
}
