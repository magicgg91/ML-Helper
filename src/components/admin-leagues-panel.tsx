"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  hasRungName,
  isSavableLadderStructure,
  leagueRungId,
  rungNameForm,
  rungNameLocales,
  rungNameToStore,
  type LeagueLadder,
  type LeagueRung,
  type LeagueRungStructure,
} from "@/lib/leagues";
import { leagues, type League } from "@/lib/player-settings";
import type { LaunchLocale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { configurationHref } from "@/lib/admin-sections";
import { useSectionDirty } from "./admin-collapsible-section";
import { ConfirmDialog } from "./admin-confirm-dialog";
import { EditorSection } from "./admin-editor-section";
import { LangTabs } from "./admin-lang-tabs";
import { OverflowMenu } from "./admin-overflow-menu";
import { Pill } from "./admin-pill";
import { VisibilitySwitch } from "./admin-visibility-switch";
import { leagueRungLabel } from "./league-rung-label";
import { useEditorForm } from "./use-editor-form";
import { useUnsavedWarning } from "./use-unsaved-warning";

/**
 * Bloc 135 §2, recoupé au Bloc 137 : la **liste** des ligues et des divisions,
 * dans Configuration.
 *
 * Au même endroit que les langues du site et la sélection de l'accueil — parce
 * qu'une division n'appartient pas à l'outil Classement plus qu'aux Gemmes ou à
 * la Progression, et que l'écran d'un outil parmi seize était le seul endroit
 * où en ajouter une.
 *
 * Bloc 137 : cet écran porte l'identité des échelons — quelle ligue de base,
 * quelle division, quel nom libre, dans quel ordre, publié ou non — et rien de
 * plus. Les seuils et récompenses de fin de saison sont *le classement* : ils
 * sont revenus dans Outils › Classement, l'écran de l'outil dont ils sont le
 * paramètre. Le Bloc 135 avait emporté les deux, ce qui donnait une création de
 * ligue là où l'on venait éditer un classement.
 *
 * Bloc 119 §3 bis, conservé : maître et détail. La liste de gauche tient
 * l'échelle entière d'un coup d'œil (visible ou non, combien de plages), la
 * droite tient exactement un échelon. L'échelon ouvert vit dans l'URL, donc un
 * barreau est un lien ; l'état du formulaire, non : changer d'échelon garde
 * toutes les saisies en cours, parce qu'il y a une seule échelle brouillon
 * derrière les deux volets et un seul enregistrement qui couvre le tout.
 */

/** L'échelle telle que le formulaire la tient : nombres et énumérations en chaînes. */
type RungDraft = {
  id: string;
  league: League | "";
  division: string;
  /**
   * Le nom libre, toutes les langues présentes — blanches là où rien n'est
   * écrit. Bloc 135 : c'était une paire FR/EN, et le site en publie cinq.
   */
  name: Record<LaunchLocale, string>;
  active: boolean;
  /**
   * Bloc 137 : combien de plages de fin de saison cet échelon porte. En lecture
   * seule — la liste le dit pour qu'on voie d'un coup d'œil lesquels sont encore
   * vides, mais les régler se fait dans Outils › Classement.
   */
  bandCount: number;
};

function toDraft(rung: LeagueRung): RungDraft {
  return {
    id: rung.id,
    league: rung.league ?? "",
    division: rung.division,
    name: rungNameForm(rung.name),
    active: rung.active,
    bandCount: rung.bands.length,
  };
}

/**
 * Bloc 108/A : un identifiant neuf qu'aucun échelon existant ne porte déjà.
 *
 * Les identifiants sont ce sur quoi pointent les plages : ils sont engendrés
 * une fois, ici, et jamais recalculés ensuite — renommer un échelon plus tard
 * ne doit pas re-cibler silencieusement toutes les plages qui le visaient.
 */
function uniqueRungId(drafts: RungDraft[], seed: Partial<RungDraft>) {
  const base = leagueRungId({
    league: (seed.league || null) as League | null,
    division: seed.division ?? "",
    name: rungNameToStore(seed.name ?? {}),
  });
  const taken = new Set(drafts.map((draft) => draft.id));
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1)
    if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
}

function serialise(drafts: RungDraft[]): LeagueRungStructure[] {
  // Bloc 108/B : l'ordre est une propriété de la liste, pas du moment où une
  // ligne a été insérée — la position d'un échelon est simplement son index.
  return drafts.map((draft, index) => ({
    id: draft.id,
    league: (draft.league || null) as League | null,
    division: draft.division.trim(),
    name: rungNameToStore(draft.name),
    position: index,
    active: draft.active,
  }));
}

/**
 * Bloc 131/C : ce qui empêche l'enregistrement, et où c'est.
 *
 * La validation était un message et rien d'autre : « Corrige les champs
 * signalés » — alors que rien n'était signalé, et que l'échelon fautif
 * pouvait être un de ceux que le volet de droite ne montre pas. Sur un écran
 * maître/détail, un refus sans adresse est un refus muet.
 *
 * Le champ est décrit par ce qu'il est à l'écran, pas par le chemin dans les
 * données : c'est ce qui permet de le retrouver, de l'entourer et d'y poser
 * le curseur.
 */
type LeagueField = { kind: "identity" };

type LeagueProblem = {
  /** L'échelon à ouvrir pour voir le champ. Vide quand rien n'est en cause. */
  rungId: string;
  field?: LeagueField;
  /** La phrase déjà traduite, celle que le champ portera sous lui. */
  message: string;
  /** Où c'est, en toutes lettres, pour le bandeau du haut. */
  where?: string;
};

/**
 * Où les plages de fin de saison se règlent depuis le Bloc 137. Lu dans le même
 * tableau que le lien « Modifier » du tableau Outils, pour que les deux ne
 * puissent pas diverger.
 */

/** L'adresse d'un champ, pour comparer un problème à ce qu'on est en train de rendre. */
function fieldKey(rungId: string, field: LeagueField) {
  return `${rungId}|${field.kind}`;
}

export function AdminLeaguesPanel({
  initialLadder,
  hiddenLocales,
  languageNames,
}: {
  initialLadder: LeagueLadder;
  /**
   * Les langues désactivées dans Configuration, donc absentes du site public.
   * Un nom de division écrit dans l'une d'elles n'est pas une erreur, et
   * l'onglet le dit plutôt que de laisser croire à un bug.
   */
  hiddenLocales?: readonly string[];
  languageNames?: Partial<Record<string, string>>;
}) {
  const t = useTranslations("admin.leagues");
  const editor = useTranslations("admin.editor");
  const locale = useLocale();
  const game = useTranslations("game");
  const gameLeagues = useTranslations("game.leagues");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dragging, setDragging] = useState<string>();
  const [removing, setRemoving] = useState<RungDraft>();
  /** La langue que le champ « nom libre » montre. Le brouillon tient les cinq. */
  const [nameLocale, setNameLocale] = useState<LaunchLocale>("fr");

  const [showProblems, setShowProblems] = useState(false);
  // Le refus vient d'être prononcé : le curseur doit aller sur le premier
  // champ fautif, une fois son échelon à l'écran (il peut être un autre
  // que celui qu'on regardait).
  const [focusPending, setFocusPending] = useState(false);
  const firstInvalid = useRef<HTMLElement | null>(null);
  const errorId = useId();

  const form = useEditorForm<RungDraft[]>({
    initial: initialLadder.map(toDraft),
    endpoint: "/api/admin/config/leagues",
    body: serialise,
    // Le bandeau du haut dit ce qui coince et où ; les champs eux-mêmes
    // portent le reste (§C). Les deux lisent la même liste.
    validate: (value) => summarise(findProblems(value)),
    // Bloc 135 : le résumé de la section (« n ligues/divisions, n actives »)
    // est calculé sur le serveur et mentirait sans cette demande.
    onSaved: () => router.refresh(),
  });
  const drafts = form.value;

  // Bloc 136 : l'en-tête de la section affiche « Modifié » tant que le
  // brouillon s'écarte de ce qui est enregistré.
  useSectionDirty(form.dirty);
  // La moitié que le Bloc 119 pose sur les écrans d'édition : l'onglet fermé
  // ou un lien suivi pendant qu'on saisit demandent aussi.
  useUnsavedWarning(form.dirty, editor("leave-warning"));

  const label = (draft: RungDraft) =>
    leagueRungLabel(
      {
        id: draft.id,
        league: (draft.league || null) as League | null,
        division: draft.division,
        name: rungNameToStore(draft.name),
        position: 0,
        active: draft.active,
        bands: [],
      },
      game,
      locale,
    ) || t("entry-untitled");

  /**
   * Tout ce qui empêche l'enregistrement, dans l'ordre où on le lit à
   * l'écran : les échelons de haut en bas, et pour chacun l'identité puis
   * ses plages.
   *
   * Les règles sont celles que l'écran appliquait déjà ; ce qui change,
   * c'est qu'elles rendent une adresse au lieu d'un booléen. Le dernier
   * filet — `isSavableLeagueLadder`, la fonction que la route utilise
   * aussi — reste consulté à la fin : s'il refuse une échelle qu'aucune
   * règle ci-dessus n'a attrapée, le message doit quand même apparaître
   * plutôt que laisser passer un enregistrement que le serveur refusera.
   */
  function findProblems(entries: RungDraft[]): LeagueProblem[] {
    const found: LeagueProblem[] = [];
    const seen = new Set<string>();
    for (const draft of entries) {
      const name = label(draft);
      const identity = () => ({
        rungId: draft.id,
        field: { kind: "identity" } as const,
        where: t("entry-league-field", {
          entry: name,
          position: entries.indexOf(draft) + 1,
        }),
      });
      if (!draft.league && !hasRungName(rungNameToStore(draft.name)))
        found.push({ ...identity(), message: t("entry-name-error") });
      // Les identifiants sont engendrés uniques ; un doublon ne peut venir que
      // des données, et c'est l'échelon qui le répète qu'il faut ouvrir.
      else if (seen.has(draft.id))
        found.push({ ...identity(), message: t("duplicate-error") });
      seen.add(draft.id);
    }
    if (found.length === 0 && !isSavableLadderStructure(serialise(entries)))
      found.push({ rungId: "", message: t("validation") });
    return found;
  }

  /** Ce que le bandeau du haut dit : combien, et le premier, en toutes lettres. */
  function summarise(found: LeagueProblem[]) {
    if (found.length === 0) return undefined;
    const [first] = found;
    return first.where
      ? t("save-blocked", {
          count: found.length,
          where: first.where,
          message: first.message,
        })
      : first.message;
  }

  const problems = findProblems(drafts);
  const marked = new Map(
    showProblems
      ? problems.flatMap((problem) =>
          problem.field
            ? [[fieldKey(problem.rungId, problem.field), problem.message]]
            : [],
        )
      : [],
  );
  const firstKey =
    showProblems && problems[0]?.field
      ? fieldKey(problems[0].rungId, problems[0].field)
      : undefined;

  const selectedId = searchParams.get("rung");
  const selectedIndex = Math.max(
    0,
    drafts.findIndex((draft) => draft.id === selectedId),
  );
  const selected = drafts[selectedIndex];

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rung", id);
    // Le fragment est conservé : c'est lui qui a ouvert la section (Bloc 136),
    // et le perdre refermerait celle-ci au prochain remontage de l'arbre.
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    router.replace(`${configurationHref}?${params.toString()}${hash}`, {
      scroll: false,
    });
  }

  /**
   * Bloc 131/C : enregistrer, ou dire où ça coince.
   *
   * L'écran est un maître/détail, et le champ fautif est souvent dans un
   * échelon que le volet de droite ne montre pas : le refus commence donc par
   * l'ouvrir. Le message, lui, vient de `useEditorForm`, qui rejoue la même
   * validation — une seule liste de problèmes pour le bandeau et pour les
   * champs.
   */
  function saveOrShowProblems() {
    const found = findProblems(drafts);
    setShowProblems(found.length > 0);
    const [first] = found;
    if (first?.field) {
      if (first.rungId !== selected?.id) select(first.rungId);
      setFocusPending(true);
    }
    void form.save();
  }

  // Le curseur suit, une fois l'échelon fautif rendu. `selectedIndex` est
  // dans les dépendances parce que l'ouverture passe par l'URL : au tour où
  // le refus est prononcé, le champ n'est pas encore à l'écran.
  useEffect(() => {
    if (!focusPending) return;
    const field = firstInvalid.current;
    if (!field) return;
    field.focus();
    setFocusPending(false);
  }, [focusPending, selectedIndex]);

  const updateDraft = (id: string, patch: Partial<RungDraft>) =>
    form.setValue((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, ...patch } : draft,
      ),
    );

  const move = (index: number, direction: -1 | 1) =>
    form.setValue((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  /** Dépose l'échelon en cours de glissement juste avant `index`. */
  function dropOn(index: number) {
    form.setValue((current) => {
      const from = current.findIndex((draft) => draft.id === dragging);
      if (from < 0 || from === index) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragging(undefined);
  }

  function addRung() {
    // Amorcé sans aucun nom, pour que le titre suive la ligue de base et la
    // division dès qu'elles sont choisies. L'identifiant est opaque exprès :
    // il est engendré une fois, avant que l'échelon ait de quoi se nommer, et
    // il ne doit plus bouger ensuite parce que des plages peuvent déjà
    // pointer dessus.
    const id = uniqueRungId(drafts, {});
    form.setValue((current) => [
      ...current,
      {
        id,
        league: "",
        division: "",
        name: rungNameForm({}),
        // Bloc 108/G : éteint jusqu'à ce qu'une administration en décide
        // autrement — un barreau neuf est en préparation, pas publié.
        active: false,
        bandCount: 0,
      },
    ]);
    select(id);
  }

  /** Ce que la validation reproche à ce champ de l'échelon ouvert, s'il y a. */
  const problemOn = (field: LeagueField) =>
    selected ? marked.get(fieldKey(selected.id, field)) : undefined;

  /** Le champ où le curseur doit aller : le premier de la liste, et lui seul. */
  const isFirstInvalid = (field: LeagueField) =>
    Boolean(selected) && firstKey === fieldKey(selected.id, field);

  /**
   * Une ref de rappel plutôt qu'une ref d'objet : le premier champ fautif
   * est tantôt un <input>, tantôt un <select>, tantôt un bouton, et une
   * seule ref d'objet ne peut pas être les trois. Stable d'un rendu à
   * l'autre, pour n'être posée et retirée que quand le champ visé change.
   */
  const keepFirstInvalid = useCallback((node: HTMLElement | null) => {
    firstInvalid.current = node;
  }, []);

  /** La ref à poser sur ce champ, ou rien. */
  const captureFirstInvalid = (field: LeagueField) =>
    isFirstInvalid(field) ? keepFirstInvalid : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* La barre d'actions que l'`EditorHeader` portait sur l'écran d'un
          outil. Mêmes mots (`admin.editor`), même enchaînement : l'état, le
          retour aux valeurs enregistrées, puis l'enregistrement. */}
      <div className="flex flex-wrap items-center gap-3">
        <AdminButton
          type="button"
          variant="primary"
          onClick={saveOrShowProblems}
          disabled={form.saving}
        >
          {editor("save")}
        </AdminButton>
        {form.dirty ? (
          <>
            <Pill tone="warn">{editor("unsaved")}</Pill>
            <AdminButton
              type="button"
              onClick={() => {
                setShowProblems(false);
                form.cancel();
              }}
              disabled={form.saving}
            >
              {editor("cancel")}
            </AdminButton>
          </>
        ) : (
          <Pill tone="ok">{`✓ ${editor("all-saved")}`}</Pill>
        )}
        {form.message && (
          <p className="text-sm text-admin-dim" role="status">
            {form.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          aria-label={t("entries-label")}
          className="flex w-full shrink-0 flex-col gap-2 lg:w-[250px]"
        >
          <ul className="flex flex-col gap-1">
            {drafts.map((draft, index) => (
              <li
                key={draft.id}
                draggable
                onDragStart={() => setDragging(draft.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropOn(index)}
                onDragEnd={() => setDragging(undefined)}
              >
                <button
                  type="button"
                  aria-current={draft.id === selected?.id ? "true" : undefined}
                  className={cn(
                    "admin-focus flex w-full items-center gap-2 rounded-admin-control border px-3 py-2 text-left text-sm",
                    draft.id === selected?.id
                      ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
                      : "border-admin-card-border bg-admin-card text-admin-text hover:border-admin-accent",
                  )}
                  onClick={() => select(draft.id)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      draft.active ? "bg-admin-ok-ink" : "bg-admin-rule",
                    )}
                  />
                  <span
                    className="min-w-0 flex-1 truncate font-semibold"
                    data-testid="league-rung-name"
                  >
                    {label(draft)}
                  </span>
                  <span className="text-xs text-admin-dim">
                    {t("band-count", { count: draft.bandCount })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <AdminButton type="button" onClick={addRung}>
            {t("add-entry")}
          </AdminButton>
        </nav>

        {selected && (
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <EditorSection
              title={label(selected)}
              description={t("entry-position", {
                position: selectedIndex + 1,
                total: drafts.length,
              })}
              actions={
                <>
                  <VisibilitySwitch
                    checked={selected.active}
                    label={t("entry-active-field", {
                      entry: label(selected),
                      position: selectedIndex + 1,
                    })}
                    labels={{ on: t("entry-public"), off: t("entry-private") }}
                    onChange={(next) =>
                      updateDraft(selected.id, { active: next })
                    }
                  />
                  <OverflowMenu
                    label={t("entry-actions", { entry: label(selected) })}
                    items={[
                      {
                        key: "up",
                        label: t("move-up", { entry: label(selected) }),
                        disabled: selectedIndex === 0,
                        onSelect: () => move(selectedIndex, -1),
                      },
                      {
                        key: "down",
                        label: t("move-down", { entry: label(selected) }),
                        disabled: selectedIndex === drafts.length - 1,
                        onSelect: () => move(selectedIndex, 1),
                      },
                      {
                        key: "remove",
                        label: t("remove-entry-label"),
                        tone: "danger",
                        onSelect: () => setRemoving(selected),
                      },
                    ]}
                  />
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
                    {t("entry-league")}
                    {/* §C : un échelon sans ligue ni nom libre n'a pas
                        d'identité, et c'est ici qu'on lui en donne une. Le
                        contour rouge et la phrase sous le champ disent ce que
                        le refus reprochait sans jamais le montrer. */}
                    <select
                      ref={captureFirstInvalid({ kind: "identity" })}
                      aria-label={t("entry-league-field", {
                        entry: label(selected),
                        position: selectedIndex + 1,
                      })}
                      aria-invalid={
                        problemOn({ kind: "identity" }) ? true : undefined
                      }
                      aria-describedby={
                        problemOn({ kind: "identity" })
                          ? `${errorId}-identity`
                          : undefined
                      }
                      className={cn(
                        "admin-control admin-focus h-9 rounded-admin-control border bg-admin-card px-2 text-sm",
                        problemOn({ kind: "identity" })
                          ? "border-admin-danger-ink text-admin-danger-ink"
                          : "border-admin-card-border text-admin-text",
                      )}
                      value={selected.league}
                      onChange={(event) =>
                        updateDraft(selected.id, {
                          league: event.target.value as League | "",
                        })
                      }
                    >
                      <option value="">{t("entry-no-league")}</option>
                      {leagues.map((league) => (
                        <option key={league} value={league}>
                          {gameLeagues(league)}
                        </option>
                      ))}
                    </select>
                    {problemOn({ kind: "identity" }) && (
                      <span
                        className="text-xs text-admin-danger-ink"
                        id={`${errorId}-identity`}
                      >
                        {problemOn({ kind: "identity" })}
                      </span>
                    )}
                  </label>
                  <TextField
                    label={t("entry-division")}
                    accessibleName={t("entry-division-field", {
                      entry: label(selected),
                      position: selectedIndex + 1,
                    })}
                    value={selected.division}
                    onChange={(division) =>
                      updateDraft(selected.id, { division })
                    }
                  />
                </div>
                {/* Bloc 135 : le nom libre est du contenu éditorial, lu par
                    le public dans sa propre langue. Il se stocke donc en
                    objet par locale sur toutes les langues du site — comme le
                    titre d'un guide — et non plus en paire FR/EN, qui
                    montrait le renommage français à quatre lecteurs sur cinq.
                    Les onglets choisissent ce qui est affiché, jamais ce qui
                    est gardé : le brouillon tient les cinq langues. */}
                <div className="flex flex-col gap-2">
                  <LangTabs
                    locale={nameLocale}
                    onChange={setNameLocale}
                    filled={(code) =>
                      rungNameLocales(rungNameToStore(selected.name)).includes(
                        code,
                      )
                    }
                    label={t("languages-label")}
                    languageNames={languageNames}
                    hiddenLocales={hiddenLocales}
                    hiddenLabel={(language) =>
                      t("language-hidden", { language })
                    }
                  />
                  <TextField
                    label={t("entry-name", {
                      language: nameLocale.toUpperCase(),
                    })}
                    accessibleName={t("entry-name-field", {
                      entry: label(selected),
                      position: selectedIndex + 1,
                      language: nameLocale.toUpperCase(),
                    })}
                    value={selected.name[nameLocale] ?? ""}
                    onChange={(value) =>
                      updateDraft(selected.id, {
                        name: { ...selected.name, [nameLocale]: value },
                      })
                    }
                  />
                </div>
              </div>
            </EditorSection>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={removing !== undefined}
        title={t("remove-entry-label")}
        description={t("remove-entry-confirm")}
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => {
          const target = removing;
          setRemoving(undefined);
          if (!target) return;
          form.setValue((current) =>
            current.filter((item) => item.id !== target.id),
          );
        }}
      />
    </div>
  );
}

function TextField({
  label,
  accessibleName,
  value,
  onChange,
}: {
  label: string;
  accessibleName: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
      {label}
      <input
        aria-label={accessibleName}
        className="admin-control admin-focus h-9 rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
