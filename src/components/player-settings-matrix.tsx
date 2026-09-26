"use client";

import type { ReactNode } from "react";
import { NumberStepper } from "./number-stepper";
import { selectOnFocus } from "../lib/utils";
import type { SkillKey } from "../lib/player-settings";

/**
 * Bloc 123 — la matrice des compétences, dans ses deux présentations.
 *
 * Un seul modèle de données pour les deux : les lignes (Équipement, Points,
 * Temple) portent une cellule par compétence, et chaque cellule sait sa
 * valeur, ses bornes, son libellé accessible et ce qu'il faut faire quand elle
 * change. Le desktop la rend en colonnes, le mobile la transpose — mais aucune
 * des deux ne calcule quoi que ce soit, et les deux appellent les mêmes
 * gestionnaires. C'est ce qui permet d'ajouter une compétence ou une ligne
 * sans avoir à se souvenir qu'il existe deux écrans.
 */

/** Une colonne : une compétence, son nom, son abréviation, son total affiché. */
export type MatrixColumn = {
  key: SkillKey;
  label: string;
  short: string;
  /** Le total de la compétence, déjà formaté (« 12,5 »). */
  total: string;
};

/**
 * Une case de saisie. `null` dit que la ligne ne concerne pas cette
 * compétence — le Temple n'en touche que cinq — et c'est une absence, pas un
 * zéro : la case rend un tiret plutôt qu'un champ qui accepterait une valeur
 * dont personne ne ferait rien.
 */
export type MatrixCell = {
  value: number;
  min: number;
  max?: number;
  step: number;
  /** Libellé accessible complet, ex. « Équipement Attaque ». */
  label: string;
  onChange: (value: number) => void;
  /** Le « = X% » sous le champ, déjà formaté. Absent sur la ligne Équipement. */
  percent?: string;
};

export type MatrixRow = {
  key: "equipment" | "points" | "temple";
  title: string;
  /** Ce qui accompagne le titre dans l'en-tête de ligne (budget, aide…). */
  note?: ReactNode;
  /** Une entrée par colonne, dans l'ordre des colonnes. */
  cells: (MatrixCell | null)[];
};

type MatrixProps = {
  columns: MatrixColumn[];
  rows: MatrixRow[];
  /** Nom accessible du tableau. */
  caption: string;
  totalLabel: string;
};

/** La case d'une ligne qui ne concerne pas cette compétence. */
function NotApplicable() {
  return (
    <span aria-hidden="true" className="player-matrix-empty">
      —
    </span>
  );
}

/**
 * Le champ du mobile : pas de boutons − / +, parce qu'à cette largeur ils
 * prennent la place du chiffre et qu'un tap sur le champ ouvre de toute façon
 * le clavier. `inputMode` suit le pas : « numeric » n'offre pas de séparateur
 * décimal sur iOS, et un champ dont le pas est 0,5 doit pouvoir recevoir 12,5.
 */
export function PlainNumberField({ cell }: { cell: MatrixCell }) {
  return (
    <input
      aria-label={cell.label}
      className="player-matrix-input"
      inputMode={Number.isInteger(cell.step) ? "numeric" : "decimal"}
      max={cell.max}
      min={cell.min}
      onChange={(event) => cell.onChange(Number(event.target.value) || 0)}
      onFocus={selectOnFocus}
      step={cell.step}
      type="number"
      value={cell.value}
    />
  );
}

/**
 * Desktop : une ligne par source, une colonne par compétence, et la ligne
 * Total en bas. Un vrai tableau — les cases se lisent par leur en-tête de
 * ligne et leur en-tête de colonne, ce qu'une grille de <div> ne donne pas.
 */
export function PlayerSettingsMatrix({
  columns,
  rows,
  caption,
  totalLabel,
}: MatrixProps) {
  return (
    <table className="player-matrix">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <td />
          {columns.map((column) => (
            <th key={column.key} scope="col">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr className={`player-matrix-row-${row.key}`} key={row.key}>
            <th scope="row">
              <span className="player-matrix-row-title">{row.title}</span>
              {row.note}
            </th>
            {row.cells.map((cell, index) => (
              <td key={columns[index].key}>
                {cell ? (
                  <>
                    <NumberStepper
                      label={cell.label}
                      max={cell.max}
                      min={cell.min}
                      onChange={cell.onChange}
                      step={cell.step}
                      value={cell.value}
                    />
                    {cell.percent !== undefined && (
                      <output
                        className={`player-matrix-percent tone-${row.key}`}
                        data-percent={`${row.key}-${columns[index].key}`}
                      >
                        = {cell.percent}%
                      </output>
                    )}
                  </>
                ) : (
                  <NotApplicable />
                )}
              </td>
            ))}
          </tr>
        ))}
        <tr className="player-matrix-row-total">
          <th scope="row">{totalLabel}</th>
          {columns.map((column) => (
            <td key={column.key}>
              <output>{column.total}%</output>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Mobile : la même matrice transposée — une ligne par compétence, trois
 * colonnes de saisie. Le total quitte sa propre ligne pour rejoindre le nom de
 * la compétence, faute de quoi il faudrait faire défiler pour le lire.
 */
export function PlayerSettingsMatrixMobile({
  columns,
  rows,
  caption,
}: Omit<MatrixProps, "totalLabel">) {
  return (
    <table className="player-matrix-mobile">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <td />
          {rows.map((row) => (
            <th className={`tone-${row.key}`} key={row.key} scope="col">
              {row.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {columns.map((column, columnIndex) => (
          <tr key={column.key}>
            <th scope="row">
              <span className="player-matrix-mobile-name">{column.label}</span>
              <output className="player-matrix-mobile-total">
                {column.total}%
              </output>
            </th>
            {rows.map((row) => {
              const cell = row.cells[columnIndex];
              return (
                <td key={row.key}>
                  {cell ? (
                    <>
                      <PlainNumberField cell={cell} />
                      {cell.percent !== undefined && (
                        <output
                          className={`player-matrix-percent tone-${row.key}`}
                          data-percent={`${row.key}-${column.key}`}
                        >
                          = {cell.percent}%
                        </output>
                      )}
                    </>
                  ) : (
                    <NotApplicable />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
