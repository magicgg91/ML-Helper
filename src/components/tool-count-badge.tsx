/**
 * Bloc 133 §C : le nombre d'outils d'une catégorie, en pastille.
 *
 * Il était jusqu'ici une phrase en gris à chasse fixe, posée à côté du nom
 * — « 4 outils disponibles » — assez longue pour repousser le nom et assez
 * discrète pour qu'on la lise en dernier. En pastille, le chiffre se lit
 * d'un coup et se pose contre le nom sans le pousser.
 *
 * Le chiffre seul ne se lit pas à voix haute : « 4 » après « Villes » ne
 * dit pas de quoi on compte quatre. D'où le texte masqué, qui porte la
 * phrase entière. Un `aria-label` sur un <span> sans rôle n'est pas exposé
 * de façon fiable par tous les lecteurs d'écran, celui-ci l'est toujours.
 */
export function ToolCountBadge({
  count,
  label,
}: {
  count: number;
  /** La lecture du chiffre : « 4 outils ». */
  label: string;
}) {
  return (
    <span className="tool-count-badge">
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
