"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminButton } from "./admin-button";
import { useSectionDirty } from "./admin-collapsible-section";
import { Pill } from "./admin-pill";
import { useSaveStatus } from "./use-save-status";
import {
  maxHomeHighlights,
  type HomeHighlight,
  type HomeHighlightKind,
} from "@/lib/home-highlights";

/**
 * Bloc 132 §4, refondu par le Bloc 143/A : le panneau « Mis en avant » de
 * l'écran Configuration.
 *
 * Ce qu'on peut choisir — guides, outils et référentiels visibles — est
 * calculé côté serveur et arrive déjà traduit et trié : l'écran n'a qu'à
 * montrer et choisir.
 *
 * Bloc 143/A : une recherche et une liste d'ajout laissaient place à **cinq
 * listes déroulantes fixes**, une par emplacement. L'ordre n'est plus une
 * manipulation — c'est la position du champ —, et les cinq places sont
 * visibles d'un coup, vides comprises.
 *
 * Chaque liste exclut ce que les quatre autres ont déjà pris, pour qu'une même
 * entrée ne puisse pas occuper deux places. Le filtrage est simple parce que
 * l'état l'est : un seul tableau de cinq cases, et les options d'un champ se
 * déduisent des quatre autres au rendu. Aucun état partagé à synchroniser.
 */
export type HighlightCandidate = {
  kind: HomeHighlightKind;
  slug: string;
  name: string;
};

const keyOf = (entry: { kind: HomeHighlightKind; slug: string }) =>
  `${entry.kind}:${entry.slug}`;

/** `tool:city-cost` redevient `{ kind, slug }`. Le slug peut contenir des
 *  tirets, jamais de deux-points : la première coupure suffit. */
function parseKey(key: string): HomeHighlight | null {
  const cut = key.indexOf(":");
  if (cut < 0) return null;
  return {
    kind: key.slice(0, cut) as HomeHighlightKind,
    slug: key.slice(cut + 1),
  };
}

export function AdminHighlightsPanel({
  candidates,
  initial,
}: {
  candidates: HighlightCandidate[];
  /**
   * La sélection enregistrée, ou `undefined` si personne n'a encore choisi.
   *
   * Retour de revue : les deux ne veulent pas dire la même chose et ne
   * doivent pas arriver ici confondus. Rien d'enregistré, c'est l'accueil
   * sur sa liste de repli ; une liste vide enregistrée, c'est le panneau
   * masqué exprès. Écrasés en `[]`, une installation neuve et un panneau
   * volontairement masqué s'affichaient pareil, et le message d'état
   * annonçait le repli alors qu'il ne s'appliquait plus.
   */
  initial: HomeHighlight[] | undefined;
}) {
  const t = useTranslations("admin.config.highlights");
  const router = useRouter();

  /**
   * Cinq cases, dont certaines vides. C'est la forme de l'écran, et elle ne
   * porte pas la même information que la liste enregistrée : un trou au
   * milieu se referme à l'enregistrement, il ne s'enregistre pas.
   */
  const [slots, setSlots] = useState<(HomeHighlight | null)[]>(() =>
    Array.from(
      { length: maxHomeHighlights },
      (_, index) => (initial ?? [])[index] ?? null,
    ),
  );
  const selected = useMemo(
    () => slots.filter((slot): slot is HomeHighlight => slot !== null),
    [slots],
  );

  /**
   * Bloc 136 : la sélection telle qu'elle est enregistrée, pour savoir si
   * celle affichée s'en écarte. Comparée en JSON parce que l'ordre compte
   * autant que le contenu — remonter une entrée est une modification.
   */
  const [saved, setSaved] = useState<HomeHighlight[]>(initial ?? []);
  useSectionDirty(JSON.stringify(selected) !== JSON.stringify(saved));
  // Vrai dès qu'une sélection est enregistrée — au chargement, ou après un
  // enregistrement réussi dans cet écran.
  const [configured, setConfigured] = useState(initial !== undefined);
  const status = useSaveStatus();

  const byKey = useMemo(
    () => new Map(candidates.map((candidate) => [keyOf(candidate), candidate])),
    [candidates],
  );

  async function save() {
    status.pending(t("saving"));
    try {
      const response = await fetch("/api/admin/config/highlights", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ highlights: selected }),
      });
      if (response.ok) {
        setConfigured(true);
        setSaved(selected);
        // Revue Codex (PR #172) : le serveur reçoit la sélection **tassée**,
        // et l'écran doit montrer la même chose. Sans cette ligne, un trou
        // laissé au milieu survit à l'enregistrement : « Emplacement 4 »
        // continue d'afficher une entrée que l'accueil place en deuxième
        // position. `router.refresh()` ne le corrige pas — il ne remonte pas
        // un composant client, donc son état local reste tel quel.
        setSlots(
          Array.from(
            { length: maxHomeHighlights },
            (_, index) => selected[index] ?? null,
          ),
        );
        // Revue Codex (PR #156), même raison que pour les langues : « n / 5
        // sélectionnés » vient du serveur.
        router.refresh();
      }
      status.settle(response.ok, {
        success: t("saved"),
        error: t("save-error", { status: response.status }),
      });
    } catch {
      status.error(t("server-error"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Pill tone={selected.length ? "ok" : "neutral"}>
          {t("count", { count: selected.length, max: maxHomeHighlights })}
        </Pill>
      </div>

      {selected.length === 0 && (
        <p className="text-sm text-admin-dim">
          {t(configured ? "empty-hidden" : "empty")}
        </p>
      )}

      <ol className="flex flex-col gap-2" data-testid="highlights-slots">
        {slots.map((slot, index) => {
          const chosenElsewhere = new Set(
            slots
              .filter((other, position) => other !== null && position !== index)
              .map((other) => keyOf(other!)),
          );
          const current = slot ? keyOf(slot) : "";
          // Une entrée dont la cible a disparu — guide dépublié, outil
          // désactivé — reste affichée et modifiable. La laisser tomber du
          // <select> la rendrait impossible à retirer, et elle occuperait une
          // des cinq places sans qu'on sache laquelle.
          const orphan = slot !== null && !byKey.has(current);
          const options = candidates.filter(
            (candidate) => !chosenElsewhere.has(keyOf(candidate)),
          );
          const label = t("slot", { position: index + 1 });
          return (
            <li className="flex items-center gap-3" key={index}>
              <label
                className="w-32 shrink-0 text-sm font-semibold"
                htmlFor={`highlight-slot-${index}`}
              >
                {label}
              </label>
              <select
                id={`highlight-slot-${index}`}
                className="admin-control admin-focus h-[var(--admin-control-h)] min-w-0 flex-1 rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-sm text-admin-text"
                value={current}
                onChange={(event) => {
                  const chosen = event.target.value
                    ? parseKey(event.target.value)
                    : null;
                  setSlots((positions) =>
                    positions.map((existing, position) =>
                      position === index ? chosen : existing,
                    ),
                  );
                }}
              >
                <option value="">{t("none")}</option>
                {orphan && (
                  // Nommée par son identifiant : c'est tout ce qui reste
                  // d'une cible disparue, et c'est assez pour la reconnaître
                  // et la remplacer.
                  <option value={current}>
                    {t("orphan", { slug: slot.slug })}
                  </option>
                )}
                {options.map((candidate) => (
                  <option key={keyOf(candidate)} value={keyOf(candidate)}>
                    {t(`kinds.${candidate.kind}`)} · {candidate.name}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3">
        <AdminButton
          variant="primary"
          onClick={save}
          disabled={status.isPending}
        >
          {t("save")}
        </AdminButton>
        {status.message && (
          <p
            className={
              status.tone === "error"
                ? "text-sm text-admin-danger-ink"
                : "text-sm text-admin-dim"
            }
            role="status"
          >
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
