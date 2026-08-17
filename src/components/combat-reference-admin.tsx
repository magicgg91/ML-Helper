"use client";

import { useState } from "react";
import type { CombatReferenceRow } from "../lib/reference-equipment";

function OptionalNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const step = (direction: number) =>
    onChange(String(Math.max(0, (Number(value) || 0) + direction * 0.1)));
  return (
    <div className="number-stepper">
      <button
        type="button"
        aria-label={`Diminuer ${label}`}
        onClick={() => step(-1)}
      >
        −
      </button>
      <input
        aria-label={label}
        type="number"
        step="0.1"
        min="0"
        value={value}
        placeholder="%"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        aria-label={`Augmenter ${label}`}
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  );
}

export function CombatReferenceAdmin({
  initialRows,
}: {
  initialRows: CombatReferenceRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState("");
  function update(
    rowIndex: number,
    field: keyof CombatReferenceRow,
    value: string,
  ) {
    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  }
  async function save() {
    setStatus("Enregistrement…");
    const response = await fetch("/api/admin/references/combat", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rows),
    });
    setStatus(
      response.ok ? "Référentiel enregistré" : "Échec de l’enregistrement",
    );
  }
  return (
    <div className="calculator-stack">
      <p>
        Les 30 lignes explicitement inconnues restent vides tant qu’elles ne
        sont pas confirmées en jeu.
      </p>
      <div className="ranking-table-wrap">
        <table className="ranking-table reference-admin-table">
          <thead>
            <tr>
              <th>Rareté</th>
              <th>Set</th>
              <th>Emplacement</th>
              {[1, 2, 3, 4].map((item) => (
                <th key={item}>Compétence {item} / %</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row.rarity}-${row.set_name}-${row.slot_type}`}>
                <td>{row.rarity}</td>
                <td>{row.set_name}</td>
                <td>{row.slot_type}</td>
                {([1, 2, 3, 4] as const).map((number) => (
                  <td key={number}>
                    <input
                      aria-label={`${row.set_name} ${row.slot_type} compétence ${number}`}
                      value={
                        row[`skill_${number}`] === "Inconnu"
                          ? ""
                          : row[`skill_${number}`]
                      }
                      placeholder="Non confirmé"
                      onChange={(event) =>
                        update(rowIndex, `skill_${number}`, event.target.value)
                      }
                    />
                    <OptionalNumber
                      label={`${row.set_name} ${row.slot_type} valeur ${number}`}
                      value={row[`value_${number}_pct`]}
                      onChange={(value) =>
                        update(rowIndex, `value_${number}_pct`, value)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="primary-button" onClick={save}>
        Enregistrer les valeurs confirmées
      </button>
      <p role="status">{status}</p>
    </div>
  );
}
