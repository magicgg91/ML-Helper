"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  orderedLadder,
  seasonMovements,
  seasonRewardTypes,
  type LeagueLadder,
  type LeagueRung,
  type SeasonBand,
  type SeasonMovement,
  type SeasonRewardType,
} from "@/lib/leagues";
import { leaguesSectionHref } from "@/lib/admin-sections";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { AdminButton } from "./admin-button";
import { EditorHeader } from "./admin-editor-header";
import { EditorSection } from "./admin-editor-section";
import { NumberField } from "./admin-number-field";
import { RowActions } from "./admin-row-actions";
import { leagueRungLabel } from "./league-rung-label";
import { useEditorForm } from "./use-editor-form";
import { useUnsavedWarning } from "./use-unsaved-warning";

/**
 * Bloc 137 : le classement, rendu à l'outil Classement.
 *
 * Le Bloc 108 avait mis l'échelle des ligues et des divisions sous l'écran de
 * cet outil, CRUD compris ; le Bloc 135 a tout emporté dans Configuration, y
 * compris les seuils et récompenses de fin de saison. Les deux fois, la couture
 * était au mauvais endroit : la **liste** des échelons est un référentiel du
 * site (tous les outils la lisent), les **plages** sont le paramètre de ce
 * seul outil.
 *
 * Cet écran ne porte donc que les plages, et l'échelle n'y est qu'une rangée de
 * boutons : on choisit un échelon existant, on règle son classement. Ni
 * création, ni suppression, ni renommage — c'est Configuration qui les tient,
 * et le renvoi en bas le dit.
 *
 * L'identité des échelons est en lecture seule ici, donc hors du formulaire :
 * seul l'état des plages est brouillon, et c'est lui seul qui part sur le fil.
 */

/** Une plage telle que le formulaire la tient : nombres et énumérations en chaînes. */
type BandRow = Record<SeasonRewardType, string> & {
  threshold: string;
  movement: string;
  target: string;
};

/** Les plages de chaque échelon, par identifiant. */
type BandsDraft = Record<string, BandRow[]>;

function toRow(band: SeasonBand): BandRow {
  const quantity = (type: SeasonRewardType) =>
    String(band.rewards.find((item) => item.type === type)?.quantity ?? 0);
  return {
    threshold: String(band.threshold),
    movement: band.movement ?? "",
    target: band.target ?? "",
    sapphires: quantity("sapphires"),
    speedups: quantity("speedups"),
    gems: quantity("gems"),
  };
}

/** Les plages telles que la route dit les avoir stockées, ramenées au brouillon. */
function draftFromBands(bands: Record<string, SeasonBand[]>): BandsDraft {
  return Object.fromEntries(
    Object.entries(bands).map(([rungId, rows]) => [rungId, rows.map(toRow)]),
  );
}

function toDraft(ladder: LeagueLadder): BandsDraft {
  return Object.fromEntries(
    ladder.map((rung) => [rung.id, rung.bands.map(toRow)]),
  );
}

function serialise(draft: BandsDraft): Record<string, SeasonBand[]> {
  return Object.fromEntries(
    Object.entries(draft).map(([rungId, rows]) => [
      rungId,
      rows.map((row) => ({
        threshold: Number(row.threshold),
        movement: (row.movement || null) as SeasonMovement | null,
        target: row.target || null,
        rewards: seasonRewardTypes
          .map((type) => ({ type, quantity: Number(row[type]) }))
          .filter((item) => item.quantity > 0),
      })),
    ]),
  );
}

/**
 * Bloc 131/C, conservé : ce qui empêche l'enregistrement, et où c'est.
 *
 * Un refus sans adresse est un refus muet, d'autant que l'échelon fautif peut
 * être un de ceux que l'écran ne montre pas — d'où un champ décrit par ce qu'il
 * est à l'écran, pour pouvoir l'ouvrir, l'entourer et y poser le curseur.
 */
type BandField =
  | { kind: "threshold"; row: number }
  | { kind: "movement"; row: number }
  | { kind: "reward"; row: number; type: SeasonRewardType };

type BandProblem = {
  /** L'échelon à ouvrir pour voir le champ. */
  rungId: string;
  field: BandField;
  /** La phrase déjà traduite, celle que le champ portera sous lui. */
  message: string;
  /** Où c'est, en toutes lettres, pour le bandeau du haut. */
  where: string;
};

function fieldKey(rungId: string, field: BandField) {
  const type = "type" in field ? field.type : "";
  return `${rungId}|${field.kind}|${field.row}|${type}`;
}

const movementTone: Record<SeasonMovement, string> = {
  promotion: "border-admin-ok-ink bg-admin-ok text-admin-ok-ink",
  stay: "border-admin-neutral-ink bg-admin-neutral text-admin-neutral-ink",
  relegation: "border-admin-danger-ink bg-admin-warn text-admin-danger-ink",
};

export function AdminRankingEditor({
  initialLadder,
  backHref,
  backLabel,
  title,
  canOpenLeagues = false,
}: {
  initialLadder: LeagueLadder;
  backHref: string;
  backLabel: string;
  title: string;
  /**
   * Revue Codex : si ce rôle peut ouvrir la section de Configuration. « Gestion
   * Outils » est l'utilisateur principal de cet écran et n'a pas
   * `configuration.read` — lui présenter un lien l'enverrait sur un 403 garanti.
   * Il lit alors la phrase sans le lien, comme le tableau Outils le fait déjà
   * pour une destination hors de portée.
   */
  canOpenLeagues?: boolean;
}) {
  const t = useTranslations("admin.ranking");
  const editor = useTranslations("admin.editor");
  const game = useTranslations("game");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showProblems, setShowProblems] = useState(false);
  /**
   * Revue Codex : les échelons que la route a laissés de côté parce que
   * Configuration les avait supprimés entre-temps. Sans les lire, l'écran
   * annonçait « enregistré » alors qu'une partie de la saisie n'avait pas été
   * écrite — un échec silencieux, ce qu'AGENTS.md interdit.
   */
  const [ignoredRungs, setIgnoredRungs] = useState<string[]>([]);
  const [focusPending, setFocusPending] = useState(false);
  const firstInvalid = useRef<HTMLElement | null>(null);
  const errorId = useId();

  // L'ordre de l'échelle, figé au chargement : cet écran ne le change pas.
  const rungs = orderedLadder(initialLadder);
  const label = (rung: LeagueRung) =>
    leagueRungLabel(rung, game, locale) || t("rung-untitled");

  const form = useEditorForm<BandsDraft>({
    initial: toDraft(rungs),
    endpoint: "/api/admin/tools/ranking",
    // La route n'écrit que les plages : elle les fusionne sur l'identité et
    // l'ordre déjà stockés, pour qu'un enregistrement ici ne puisse pas défaire
    // un renommage fait dans Configuration entre-temps.
    body: (value) => ({ bands: serialise(value) }),
    validate: (value) => summarise(findProblems(value)),
    // `adopt` est le seul endroit où la réponse de la route est lue. Elle rend
    // `ignored` ; s'il n'est pas vide, on le dit et on redemande l'écran, pour
    // qu'il cesse de montrer un échelon qui n'existe plus.
    adopt: (stored): BandsDraft => {
      const answer = stored as {
        bands?: Record<string, SeasonBand[]>;
        ignored?: unknown;
      };
      const names = Array.isArray(answer?.ignored)
        ? answer.ignored.map(String)
        : [];
      setIgnoredRungs(names);
      // L'écran cesse de montrer un échelon que Configuration a supprimé : il se
      // redemande, donc il repart de l'échelle réelle.
      if (names.length > 0) router.refresh();
      // Bloc 107/A : on adopte ce que la route dit avoir stocké, pas ce qu'on
      // croit avoir envoyé.
      return answer?.bands ? draftFromBands(answer.bands) : toDraft(rungs);
    },
  });
  const draft = form.value;

  useUnsavedWarning(form.dirty, editor("leave-warning"));

  function rowsOf(rungId: string) {
    return draft[rungId] ?? [];
  }

  function setRows(rungId: string, rows: BandRow[]) {
    form.setValue((current) => ({ ...current, [rungId]: rows }));
  }

  function findProblems(value: BandsDraft): BandProblem[] {
    const found: BandProblem[] = [];
    for (const rung of rungs) {
      const name = label(rung);
      (value[rung.id] ?? []).forEach((row, index) => {
        const where = (field: string) =>
          t("row-label", { league: name, row: index + 1, field });
        const threshold = Number(row.threshold);
        if (
          row.threshold.trim() === "" ||
          !Number.isFinite(threshold) ||
          threshold <= 0 ||
          threshold > 100
        )
          found.push({
            rungId: rung.id,
            field: { kind: "threshold", row: index },
            message: t("range-error"),
            where: where(t("threshold")),
          });
        if (Boolean(row.movement) !== Boolean(row.target))
          found.push({
            rungId: rung.id,
            field: { kind: "movement", row: index },
            message: t("pairing-error"),
            where: where(t("movement")),
          });
        for (const type of seasonRewardTypes) {
          const quantity = Number(row[type]);
          if (
            row[type].trim() === "" ||
            !Number.isInteger(quantity) ||
            quantity < 0
          )
            found.push({
              rungId: rung.id,
              field: { kind: "reward", row: index, type },
              message: t("integer-error"),
              where: where(t(`reward-types.${type}`)),
            });
        }
      });
    }
    return found;
  }

  /** Ce que le bandeau du haut dit : combien, et le premier, en toutes lettres. */
  function summarise(found: BandProblem[]) {
    if (found.length === 0) return undefined;
    const [first] = found;
    // Trois arguments, pas deux : le compte, l'adresse du champ, et la raison.
    // En oublier un ne rend pas une phrase incomplète — `next-intl` échoue à
    // formater et affiche la clé, ce qui est exactement ce qu'un utilisateur ne
    // doit jamais voir.
    return t("save-blocked", {
      count: found.length,
      where: first.where,
      message: first.message,
    });
  }

  const problems = showProblems ? findProblems(draft) : [];
  const marked = new Map(
    problems.map((problem) => [
      fieldKey(problem.rungId, problem.field),
      problem.message,
    ]),
  );
  const [first] = problems;
  const firstKey = first ? fieldKey(first.rungId, first.field) : undefined;

  const selectedId = searchParams.get("rung");
  const selected =
    rungs.find((rung) => rung.id === selectedId) ?? rungs[0] ?? undefined;

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rung", id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function saveOrShowProblems() {
    const found = findProblems(draft);
    setShowProblems(found.length > 0);
    // Le premier champ fautif peut être sous un autre échelon que celui qu'on
    // regarde : on l'ouvre, puis on y pose le curseur au rendu suivant.
    const [problem] = found;
    if (problem) {
      if (problem.rungId !== selected?.id) select(problem.rungId);
      setFocusPending(true);
    }
    // `form.save()` dans tous les cas : c'est lui qui relit la validation et
    // pose le message du bandeau, ou qui part sur le fil quand il n'y a rien à
    // signaler. Refuser ici en silence laisserait l'écran sans phrase.
    void form.save();
  }

  // Le curseur suit, une fois l'échelon fautif rendu. L'identifiant ouvert est
  // dans les dépendances parce que l'ouverture passe par l'URL : au tour où le
  // refus est prononcé, le champ n'est pas encore à l'écran. Et le drapeau ne
  // retombe qu'une fois le champ trouvé, sinon le refus perdrait son curseur.
  useEffect(() => {
    if (!focusPending) return;
    const field = firstInvalid.current;
    if (!field) return;
    field.focus();
    setFocusPending(false);
  }, [focusPending, selected?.id]);

  const keepFirstInvalid = useCallback((node: HTMLElement | null) => {
    firstInvalid.current = node;
  }, []);

  const problemOn = (field: BandField) =>
    selected ? marked.get(fieldKey(selected.id, field)) : undefined;
  const isFirstInvalid = (field: BandField) =>
    Boolean(selected) && firstKey === fieldKey(selected.id, field);
  const captureFirstInvalid = (field: BandField) =>
    isFirstInvalid(field) ? keepFirstInvalid : undefined;

  // Bloc 108/A : toute cible possible est un échelon de l'échelle, y compris un
  // échelon encore inactif — on prépare une saison avant de la publier.
  const targetOptions = [
    { value: "", label: t("unconfirmed-option") },
    ...rungs.map((rung) => ({ value: rung.id, label: label(rung) })),
  ];

  const setRow = (index: number, patch: Partial<BandRow>) => {
    if (!selected) return;
    setRows(
      selected.id,
      rowsOf(selected.id).map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        dirty={form.dirty}
        saving={form.saving}
        onSave={saveOrShowProblems}
        onCancel={() => {
          setShowProblems(false);
          form.cancel();
        }}
        message={form.message}
      />

      {ignoredRungs.length > 0 && (
        <p
          className="rounded-admin-card border border-admin-danger-ink bg-admin-warn px-3 py-2 text-sm text-admin-danger-ink"
          role="alert"
        >
          {t("ignored-rungs", { count: ignoredRungs.length })}
        </p>
      )}
      {rungs.length === 0 ? (
        // L'échelle est vide : rien à classer, et la sortie est nommée plutôt
        // qu'un écran muet.
        <EditorSection title={t("rungs-label")}>
          <p className="text-sm text-admin-dim">
            {t("no-rung")}
            {canOpenLeagues && (
              <>
                {" "}
                <Link
                  className="admin-focus rounded-admin-control font-medium text-admin-text underline"
                  href={leaguesSectionHref}
                >
                  {t("leagues-elsewhere-link")}
                </Link>
              </>
            )}
          </p>
        </EditorSection>
      ) : (
        selected && (
          <>
            <EditorSection title={t("rungs-label")}>
              {/*
                Des boutons, pas une liste maître/détail : on ne gère pas
                l'échelle ici, on choisit l'échelon dont on règle le classement.
                Le même geste que le sélecteur du Classement public.
              */}
              <div
                aria-label={t("rungs-label")}
                className="flex flex-wrap gap-2"
                role="group"
              >
                {rungs.map((rung) => {
                  const current = rung.id === selected.id;
                  return (
                    <button
                      key={rung.id}
                      aria-current={current ? "true" : undefined}
                      className={cn(
                        "admin-focus flex items-center gap-2 rounded-admin-control border px-3 py-2 text-sm font-semibold",
                        current
                          ? "border-admin-accent-ink bg-admin-accent text-admin-accent-ink"
                          : "border-admin-card-border bg-admin-card text-admin-text",
                      )}
                      onClick={() => select(rung.id)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          rung.active ? "bg-admin-ok-ink" : "bg-admin-rule",
                        )}
                      />
                      {label(rung)}
                      {!rung.active && (
                        <span className="text-xs font-normal text-admin-dim">
                          {t("rung-hidden")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-admin-dim">
                {t("leagues-elsewhere")}
                {canOpenLeagues && (
                  <>
                    {" "}
                    <Link
                      className="admin-focus rounded-admin-control font-medium text-admin-text underline"
                      href={leaguesSectionHref}
                    >
                      {t("leagues-elsewhere-link")}
                    </Link>
                  </>
                )}
              </p>
            </EditorSection>

            <EditorSection
              title={t("bands-section")}
              actions={
                <AdminButton
                  type="button"
                  size="sm"
                  onClick={() =>
                    setRows(selected.id, [
                      ...rowsOf(selected.id),
                      {
                        threshold: "100",
                        movement: "",
                        target: "",
                        sapphires: "0",
                        speedups: "0",
                        gems: "0",
                      },
                    ])
                  }
                >
                  {t("add")}
                </AdminButton>
              }
              description={t("band-count", {
                count: rowsOf(selected.id).length,
              })}
            >
              {rowsOf(selected.id).length === 0 ? (
                <p className="text-sm text-admin-dim">{t("empty")}</p>
              ) : (
                <div className="overflow-x-auto rounded-admin-card border border-admin-card-border">
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">
                      {t("bands-caption", { entry: label(selected) })}
                    </caption>
                    <thead className="bg-admin-head">
                      <tr className="border-b border-admin-rule">
                        <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                          {t("threshold")}
                        </th>
                        <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                          {t("movement")}
                        </th>
                        <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                          {t("target")}
                        </th>
                        {seasonRewardTypes.map((type) => (
                          <th
                            key={type}
                            className="admin-column-head px-3 py-2 text-right text-admin-dim"
                          >
                            {t(`reward-types.${type}`)}
                          </th>
                        ))}
                        <th className="admin-column-head px-3 py-2 text-right text-admin-dim">
                          {t("row-actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsOf(selected.id).map((row, index) => {
                        const rowLabel = (field: string) =>
                          t("row-label", {
                            league: label(selected),
                            row: index + 1,
                            field,
                          });
                        return (
                          <tr
                            key={index}
                            className="h-[var(--admin-row-h-edit)] border-b border-admin-rule-soft last:border-0"
                          >
                            <td className="px-3">
                              <span className="flex items-center gap-1.5">
                                <span className="text-xs text-admin-dim">
                                  {t("top")}
                                </span>
                                <NumberField
                                  label={rowLabel(t("threshold"))}
                                  hideLabel
                                  width="s"
                                  unit="%"
                                  invalid={Boolean(
                                    problemOn({
                                      kind: "threshold",
                                      row: index,
                                    }),
                                  )}
                                  invalidMessage={problemOn({
                                    kind: "threshold",
                                    row: index,
                                  })}
                                  fieldRef={captureFirstInvalid({
                                    kind: "threshold",
                                    row: index,
                                  })}
                                  value={
                                    row.threshold === ""
                                      ? null
                                      : Number(row.threshold)
                                  }
                                  onChange={(next) =>
                                    setRow(index, {
                                      threshold:
                                        next === null ? "" : String(next),
                                    })
                                  }
                                />
                              </span>
                            </td>
                            <td className="px-3">
                              {/* §C : le mouvement et la cible vont par paire,
                                  et c'est la paire qui est refusée — le contour
                                  tient donc le groupe entier, pas l'un de ses
                                  trois boutons. */}
                              <div
                                aria-label={rowLabel(t("movement"))}
                                aria-invalid={
                                  problemOn({ kind: "movement", row: index })
                                    ? true
                                    : undefined
                                }
                                aria-describedby={
                                  problemOn({ kind: "movement", row: index })
                                    ? `${errorId}-movement-${index}`
                                    : undefined
                                }
                                className={cn(
                                  "flex gap-1 rounded-admin-control border border-transparent",
                                  problemOn({ kind: "movement", row: index }) &&
                                    "border-admin-danger-ink p-1",
                                )}
                                role="radiogroup"
                              >
                                {seasonMovements.map((movement) => (
                                  <button
                                    key={movement}
                                    ref={
                                      movement === seasonMovements[0]
                                        ? captureFirstInvalid({
                                            kind: "movement",
                                            row: index,
                                          })
                                        : undefined
                                    }
                                    type="button"
                                    role="radio"
                                    aria-checked={row.movement === movement}
                                    className={cn(
                                      "admin-focus rounded-admin-control border px-2 py-1 text-xs font-semibold",
                                      row.movement === movement
                                        ? movementTone[movement]
                                        : "border-admin-card-border text-admin-dim",
                                    )}
                                    onClick={() =>
                                      setRow(index, {
                                        // Recliquer sur celui qui est choisi
                                        // l'efface : une plage sans mouvement
                                        // confirmé est un état réel.
                                        movement:
                                          row.movement === movement
                                            ? ""
                                            : movement,
                                      })
                                    }
                                  >
                                    {t(`movements.${movement}`)}
                                  </button>
                                ))}
                              </div>
                              {problemOn({ kind: "movement", row: index }) && (
                                <span
                                  className="block text-xs text-admin-danger-ink"
                                  id={`${errorId}-movement-${index}`}
                                >
                                  {problemOn({ kind: "movement", row: index })}
                                </span>
                              )}
                            </td>
                            <td className="px-3">
                              <select
                                aria-label={rowLabel(t("target"))}
                                className="admin-control admin-focus h-9 rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
                                value={row.target}
                                onChange={(event) =>
                                  setRow(index, { target: event.target.value })
                                }
                              >
                                {targetOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {seasonRewardTypes.map((type) => (
                              <td key={type} className="px-3 text-right">
                                <NumberField
                                  label={rowLabel(t(`reward-types.${type}`))}
                                  hideLabel
                                  width="s"
                                  invalid={Boolean(
                                    problemOn({
                                      kind: "reward",
                                      row: index,
                                      type,
                                    }),
                                  )}
                                  invalidMessage={problemOn({
                                    kind: "reward",
                                    row: index,
                                    type,
                                  })}
                                  fieldRef={captureFirstInvalid({
                                    kind: "reward",
                                    row: index,
                                    type,
                                  })}
                                  value={
                                    row[type] === "" ? null : Number(row[type])
                                  }
                                  onChange={(next) =>
                                    setRow(index, {
                                      [type]: next === null ? "" : String(next),
                                    })
                                  }
                                />
                              </td>
                            ))}
                            <td className="px-3">
                              <RowActions
                                // La plage, pas l'un de ses champs (même raison
                                // que dans l'éditeur Événements).
                                name={t("band-name", {
                                  entry: label(selected),
                                  row: index + 1,
                                })}
                                onRemove={() =>
                                  setRows(
                                    selected.id,
                                    rowsOf(selected.id).filter(
                                      (_, i) => i !== index,
                                    ),
                                  )
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </EditorSection>
          </>
        )
      )}
    </div>
  );
}
