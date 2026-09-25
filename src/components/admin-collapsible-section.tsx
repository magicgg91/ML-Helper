"use client";

import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { Pill } from "./admin-pill";
import { cn } from "@/lib/utils";

/**
 * Bloc 136 : une section repliable de l'écran Configuration.
 *
 * Le Bloc 100/C les avait repliables, le Bloc 119 les a dépliées pour de bon
 * — « en deux colonnes, tout est lisible d'un coup, il ne reste rien à
 * replier ». L'écran a grossi depuis (les mises en avant du Bloc 132 §4, la
 * purge du journal du Bloc 131/E), et la décision s'inverse : repliables, et
 * repliées au chargement. Ce qui remplace la lecture d'un coup d'œil, c'est
 * le résumé en pastille dans l'en-tête — l'état de la section sans l'ouvrir.
 *
 * Distinct de CollapsibleGroup, qui plie une rangée de tableau à l'intérieur
 * d'un écran d'édition : celle-ci est une carte de page, elle porte un titre
 * de niveau 2, elle s'ouvre sur une ancre, et elle gère elle-même son état.
 * Deux composants parce que ce sont deux objets, pas deux réglages d'un même.
 *
 * Écrit pour les sections à venir autant que pour les trois d'aujourd'hui :
 * rien ici ne connaît les langues, le script de suivi ni les mises en avant.
 */

/** Par où un panneau fait savoir qu'il a une saisie non enregistrée. */
const ReportDirty = createContext<((dirty: boolean) => void) | undefined>(
  undefined,
);

/**
 * À appeler depuis le panneau d'une section : lui seul sait si ce qu'il
 * affiche diffère de ce qui est enregistré.
 *
 * Hors d'une section repliable, c'est sans effet — le panneau reste montable
 * ailleurs, et ses tests n'ont pas de fournisseur à installer.
 */
export function useSectionDirty(dirty: boolean) {
  const report = useContext(ReportDirty);
  useEffect(() => {
    report?.(dirty);
  }, [dirty, report]);
  // Un panneau démonté ne laisse pas sa pastille derrière lui.
  useEffect(() => () => report?.(false), [report]);
}

export function CollapsibleSection({
  id,
  title,
  description,
  summary,
  children,
}: {
  /**
   * L'ancre de la section : `#langues` l'ouvre et l'amène à l'écran. C'est
   * aussi ce qui permet de pointer quelqu'un vers un réglage précis.
   */
  id: string;
  title: string;
  description?: string;
  /** L'état de la section en une pastille, lisible sans l'ouvrir. */
  summary?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("admin.common");
  const panelId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  /**
   * Repliée par défaut, y compris dans le HTML rendu côté serveur : l'ancre
   * n'existe que dans le navigateur (elle n'est pas envoyée au serveur), donc
   * c'est ici qu'on la lit, après le premier rendu. `hashchange` couvre le
   * cas où l'on passe d'une ancre à l'autre sans quitter la page.
   */
  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash !== `#${id}`) return;
      setOpen(true);
      document.getElementById(id)?.scrollIntoView();
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [id]);

  return (
    // Pas d'`overflow-hidden` sur la carte : l'anneau de focus de l'en-tête
    // est dessiné 2 px en dehors du bouton, et le bouton remplit la carte —
    // masquer le débordement le découpait entièrement (vu au navigateur :
    // `:focus-visible` actif, outline calculée à 2px, et rien à l'écran).
    // Rien ne déborde ici : le panneau n'a pas de fond à rogner, seuls le
    // trait et le rayon de la carte dessinent ses coins.
    <section
      id={id}
      className="rounded-admin-card border border-admin-card-border bg-admin-card"
    >
      {/* Le titre reste un titre : ces cartes découpent la page sous son
          <h1>, et le plan de l'écran en dépend. Le bouton est dedans plutôt
          que l'inverse — un <h2> n'est pas du contenu de phrasé, et n'a rien
          à faire à l'intérieur d'un <button>. */}
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          // Nommé par son seul titre, décrit par le reste : sans ça, le nom
          // du bouton serait « Langues Les langues du site public 3 actives
          // sur 5 », et l'en-tête de section deviendrait une phrase.
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className="admin-focus flex w-full items-center gap-3 p-6 text-left"
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-admin-dim transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            {/* L'interlettrage des titres, redit ici pour la même raison
                inverse : `0.025em` se résout sur la taille de l'élément qui
                le porte, et le <h2> ne porte plus les 17px du titre. Redit,
                il retombe sur les 0.425px de la carte d'avant. */}
            <span
              id={titleId}
              className="admin-section-title tracking-[0.025em] text-admin-text"
            >
              {title}
            </span>
            {/* La police du corps, redite ici : tout l'en-tête vit dans le
                <h2>, et globals.css donne aux titres la fonte d'affichage,
                qui est une capitale et ne se lit pas en paragraphe. Seul le
                titre la garde. Même chose pour l'interlettrage des titres. */}
            {description && (
              <span
                id={descriptionId}
                className="font-admin-body text-sm tracking-normal text-admin-dim"
              >
                {description}
              </span>
            )}
          </span>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-2 font-admin-body tracking-normal">
            {/* Ce qui attend d'être enregistré passe devant l'état
                enregistré : c'est la seule des deux informations sur
                laquelle il y a quelque chose à faire. */}
            {dirty && <Pill tone="warn">{t("modified")}</Pill>}
            {summary}
          </span>
        </button>
      </h2>
      {/* Masqué, jamais démonté : replier une section pendant qu'on y tape
          ne doit pas remettre le formulaire à zéro. */}
      <div
        hidden={!open}
        id={panelId}
        className="border-t border-admin-rule p-6"
      >
        <ReportDirty.Provider value={setDirty}>{children}</ReportDirty.Provider>
      </div>
    </section>
  );
}
