"use client";

import { useState } from "react";

type GuideRow = { id: string; slug: string; status: string };

const labels: Record<string, string> = {
  draft: "Brouillon",
  pending_review: "À valider",
  published: "Publié",
};

export function GuideStatusList({
  rows,
  canPublish,
}: {
  rows: GuideRow[];
  canPublish: boolean;
}) {
  const [guides, setGuides] = useState(rows);
  const [message, setMessage] = useState("");

  async function update(id: string, status: string) {
    setMessage("Enregistrement…");
    const response = await fetch(`/api/admin/guides/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (!response?.ok) {
      setMessage(
        `Échec de l’enregistrement${response ? ` (HTTP ${response.status})` : ""}.`,
      );
      return;
    }
    setGuides((current) =>
      current.map((guide) => (guide.id === id ? { ...guide, status } : guide)),
    );
    setMessage("Statut du guide enregistré.");
  }

  return (
    <>
      <div className="ranking-table-wrap">
        <table className="ranking-table">
          <thead>
            <tr>
              <th>Slug</th>
              <th>Statut</th>
              <th>Changer le statut</th>
            </tr>
          </thead>
          <tbody>
            {guides.map((guide) => (
              <tr key={guide.id}>
                <td>{guide.slug}</td>
                <td>{labels[guide.status] ?? guide.status}</td>
                <td>
                  <select
                    aria-label={`Statut de ${guide.slug}`}
                    value={guide.status}
                    onChange={(event) => update(guide.id, event.target.value)}
                  >
                    <option value="draft">Brouillon</option>
                    <option value="pending_review">À valider</option>
                    {canPublish && <option value="published">Publié</option>}
                  </select>
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
