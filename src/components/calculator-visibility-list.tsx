"use client";

import { useState } from "react";

type CalculatorRow = {
  id: string;
  slug: string;
  label: string;
  active: boolean;
};

export function CalculatorVisibilityList({ rows }: { rows: CalculatorRow[] }) {
  const [calculators, setCalculators] = useState(rows);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string>();

  async function toggle(row: CalculatorRow) {
    setSaving(row.id);
    setMessage("Enregistrement…");
    try {
      const response = await fetch(`/api/admin/calculators/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      if (!response.ok) {
        setMessage(`Échec de l’enregistrement (HTTP ${response.status}).`);
        return;
      }
      setCalculators((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, active: !item.active } : item,
        ),
      );
      setMessage(
        `${row.label} est maintenant ${row.active ? "inactif" : "actif"}.`,
      );
    } catch {
      setMessage("Impossible de joindre le serveur. Réessaie plus tard.");
    } finally {
      setSaving(undefined);
    }
  }

  return (
    <>
      <div className="ranking-table-wrap">
        <table className="ranking-table">
          <thead>
            <tr>
              <th>Calculateur</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {calculators.map((row) => (
              <tr key={row.id}>
                <td>{row.label}</td>
                <td
                  className={row.active ? "status-active" : "status-inactive"}
                >
                  {row.active ? "Actif" : "Inactif"}
                </td>
                <td>
                  <button
                    className="secondary-action"
                    type="button"
                    disabled={saving === row.id}
                    onClick={() => toggle(row)}
                  >
                    {row.active ? "Désactiver" : "Activer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
    </>
  );
}
