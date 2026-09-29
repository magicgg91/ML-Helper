"use client";

import { strokeIcon } from "./icon-base";

/**
 * Bloc 144 — les deux commandes du bandeau « Paramètres du joueur » qui ne
 * sont ni un champ ni un bouton de ligue : l'interrupteur des temples et la
 * remise à zéro des points.
 *
 * Elles vivent ici plutôt que dans le panneau parce que chacune est rendue à
 * deux endroits — l'un pour le desktop, l'autre pour la vue transposée du
 * mobile — et que deux copies d'un rail d'interrupteur, c'est deux
 * comportements qui finissent par diverger.
 *
 * Pourquoi pas `VisibilitySwitch` (src/components/admin-visibility-switch.tsx),
 * le seul interrupteur déjà écrit sur ce site : il est à l'administration ce
 * que celui-ci est au public, et les deux ne peuvent pas être le même objet
 * aujourd'hui. Il est habillé par les classes utilitaires et les jetons
 * `--admin-*` (`bg-admin-accent`, `--admin-switch-w`), qui ne sont déclarés
 * que sous `.admin-shell` ; et il lit lui-même ses libellés par défaut dans
 * `admin.common`, un espace de noms que le Bloc 118 a volontairement retiré
 * de de/es/tr — le monter sur une page publique allemande le ferait tomber
 * sur une clé absente. Le rapprochement des deux demanderait de toucher aux
 * écrans d'administration, hors du périmètre de ce bloc ; signalé dans la PR.
 */

/**
 * L'interrupteur « Temples » : inclure ou exclure les temples des calculs.
 *
 * Présentationnel — l'état et sa persistance appartiennent au panneau, comme
 * pour le reste des paramètres du joueur.
 *
 * Le `<label>` enveloppe le bouton pour que le mot à droite soit cliquable
 * lui aussi. Un `<button>` est un élément étiquetable au sens HTML, et
 * l'activation du label ne se propage pas au contrôle quand c'est le contrôle
 * lui-même qui a été cliqué : pas de double bascule à craindre. Le nom
 * accessible vient de `aria-label`, qui l'emporte sur le contenu du label —
 * d'où le mot marqué `aria-hidden`, pour ne pas être lu deux fois.
 */
export function TempleSwitch({
  checked,
  label,
  onLabel,
  offLabel,
  onChange,
}: {
  checked: boolean;
  /** Ce que l'interrupteur commande, en toutes lettres, pour qui l'écoute. */
  label: string;
  /** Le mot à droite quand il est activé. */
  onLabel: string;
  /** Le mot à droite quand il est désactivé. */
  offLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="player-switch-field">
      <button
        aria-checked={checked}
        aria-label={label}
        className="player-switch"
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span aria-hidden="true" className="player-switch-knob">
          {checked && (
            <svg
              {...strokeIcon}
              className="player-switch-check"
              strokeWidth={3.5}
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </span>
      </button>
      {/* L'état est déjà porté par `aria-checked` ; ce mot le répète pour
          l'œil, donc il est masqué au lecteur d'écran plutôt que lu deux
          fois. Même parti pris que VisibilitySwitch côté administration. */}
      <span aria-hidden="true" className="player-switch-text">
        {checked ? onLabel : offLabel}
      </span>
    </label>
  );
}

/**
 * La remise à zéro des points de compétence : un bouton-icône rond, à droite
 * du compteur « alloués / disponibles ».
 *
 * Désactivé quand il n'y a rien à remettre à zéro — un bouton qui ne ferait
 * rien vaut mieux éteint qu'actif et muet.
 */
export function PointsReset({
  disabled,
  label,
  onReset,
}: {
  disabled: boolean;
  /** Sert à la fois de nom accessible et d'infobulle. */
  label: string;
  onReset: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="player-points-reset"
      disabled={disabled}
      onClick={onReset}
      title={label}
      type="button"
    >
      <svg {...strokeIcon} className="player-points-reset-icon">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
  );
}
