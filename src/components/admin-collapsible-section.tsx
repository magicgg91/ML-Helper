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

/**
 * L'ancre demandée, gardée hors de React et lue dès l'import.
 *
 * Sur cet écran, une arrivée par ancre ne laisse rien à lire au moment où
 * l'on regarde. Tracé au navigateur : le module est importé alors que l'URL
 * porte encore `#suivi-visites`, puis le routeur de Next appelle
 * `replaceState /admin/config` (pile : `next/dist/client`, dans un rendu de
 * React), et quand les effets des sections tournent, `location.hash` est
 * vide. Un `useState` initialisé dans un effet et une relecture de l'URL
 * échouent donc tous les deux — c'est l'e2e qui l'a montré, pas le test de
 * composant.
 *
 * D'où : la valeur est prise à l'import, là où le fragment existe encore ;
 * l'écouteur `hashchange` est posé une fois pour toutes, et non attaché puis
 * détaché au rythme des montages, pour couvrir le passage d'une ancre à
 * l'autre sans rechargement ; et chaque section vient lire cette mémoire en
 * montant, ce qui la fait survivre à un remontage de l'arbre.
 *
 * `null` veut dire « rien de mémorisé, va voir l'URL » ; la chaîne vide veut
 * dire « plus d'ancre », ce que pose un repli fait à la main.
 *
 * Revue Codex (PR #156) : cette mémoire s'efface quand l'écran est quitté.
 * Une navigation App Router n'émet pas `hashchange`, donc rien d'autre ne la
 * remettrait à zéro : revenir sur /admin/config sans fragment rouvrait la
 * section visée la fois d'avant. Le compte des sections montées dit quand
 * l'écran part ; l'effacement est différé d'un tour de boucle parce qu'un
 * remontage immédiat — React rejoue les effets deux fois en développement —
 * passe lui aussi par zéro, et celui-là ne doit rien perdre.
 */
let requestedAnchor: string | null =
  typeof window === "undefined" ? null : window.location.hash || null;
const anchorWatchers = new Set<() => void>();

if (typeof window !== "undefined")
  window.addEventListener("hashchange", (event) => {
    requestedAnchor = new URL(event.newURL).hash || null;
    for (const watcher of anchorWatchers) watcher();
  });

function anchorRequested() {
  if (requestedAnchor !== null) return requestedAnchor;
  return typeof window === "undefined" ? "" : window.location.hash;
}

function forgetAnchor(id: string) {
  if (anchorRequested() === `#${id}`) requestedAnchor = "";
}

let mountedSections = 0;

function watchAnchor(openIfTargeted: () => void) {
  mountedSections += 1;
  anchorWatchers.add(openIfTargeted);
  return () => {
    mountedSections -= 1;
    anchorWatchers.delete(openIfTargeted);
    queueMicrotask(() => {
      if (mountedSections === 0) requestedAnchor = null;
    });
  };
}

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
  tone = "default",
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
  /**
   * `danger` pour une section dont l'action détruit quelque chose : trait et
   * titre passent au rouge, comme la carte de purge le faisait déjà seule
   * (Bloc 119). C'est le seul écart de couleur prévu — une section n'a pas
   * de thème à elle.
   */
  tone?: "default" | "danger";
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
   * n'est pas envoyée au serveur, donc elle se lit ici, après le premier
   * rendu — et à chaque fois qu'elle change, y compris après un remontage
   * (voir `anchorRequested` plus haut).
   */
  useEffect(() => {
    const openIfTargeted = () => {
      if (anchorRequested() !== `#${id}`) return;
      setOpen(true);
      document.getElementById(id)?.scrollIntoView();
    };
    openIfTargeted();
    return watchAnchor(openIfTargeted);
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
      className={cn(
        "rounded-admin-card border bg-admin-card",
        tone === "danger"
          ? "border-admin-danger-border"
          : "border-admin-card-border",
      )}
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
          onClick={() => {
            // Un repli fait à la main l'emporte sur l'ancre qui avait ouvert
            // la section : sans ça, le prochain remontage la rouvrirait.
            forgetAnchor(id);
            setOpen((current) => !current);
          }}
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
              className={cn(
                "admin-section-title tracking-[0.025em]",
                tone === "danger" ? "text-admin-danger-ink" : "text-admin-text",
              )}
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
