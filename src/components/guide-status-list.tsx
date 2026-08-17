"use client";

import Link from "next/link";
import { useState } from "react";

export type GuideAdminRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  active: boolean;
};
const labels: Record<string, string> = {
  draft: "Brouillon",
  pending_review: "En review",
  published: "Publié",
};

export function GuideStatusList({
  rows,
  canPublish,
  canDelete,
}: {
  rows: GuideAdminRow[];
  canPublish: boolean;
  canDelete: boolean;
}) {
  const [guides, setGuides] = useState(rows);
  const [message, setMessage] = useState("");
  async function changeStatus(id: string, status: string) {
    const response = await fetch(`/api/admin/guides/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok)
      return setMessage("Ton rôle ne permet pas ce changement de statut.");
    setGuides((current) =>
      current.map((guide) => (guide.id === id ? { ...guide, status } : guide)),
    );
    setMessage("Statut enregistré.");
  }
  async function toggle(id: string, active: boolean) {
    const response = await fetch(`/api/admin/guides/${id}/active`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!response.ok)
      return setMessage("Impossible de modifier la visibilité.");
    setGuides((current) =>
      current.map((guide) => (guide.id === id ? { ...guide, active } : guide)),
    );
    setMessage(active ? "Guide activé." : "Guide désactivé.");
  }
  async function remove(guide: GuideAdminRow) {
    if (
      !window.confirm(`Supprimer définitivement le guide « ${guide.title} » ?`)
    )
      return;
    const response = await fetch(`/api/admin/guides/${guide.id}`, {
      method: "DELETE",
    });
    if (!response.ok)
      return setMessage("Ton rôle ne permet pas de supprimer ce guide.");
    setGuides((current) => current.filter((item) => item.id !== guide.id));
    setMessage("Guide supprimé définitivement.");
  }
  return (
    <>
      <div className="ranking-table-wrap">
        <table className="ranking-table guide-admin-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Auteur</th>
              <th>Créé le</th>
              <th>Dernière édition</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {guides.map((guide) => (
              <tr
                key={guide.id}
                className={guide.active ? undefined : "is-disabled"}
                title={
                  guide.active
                    ? undefined
                    : "Désactivé et invisible côté public"
                }
              >
                <td>{guide.title || guide.slug}</td>
                <td>{guide.author}</td>
                <td>{guide.createdAt}</td>
                <td>{guide.updatedAt}</td>
                <td>
                  <select
                    aria-label={`Statut de ${guide.title || guide.slug}`}
                    value={guide.status}
                    onChange={(event) =>
                      changeStatus(guide.id, event.target.value)
                    }
                  >
                    <option value="draft">{labels.draft}</option>
                    <option value="pending_review">
                      {labels.pending_review}
                    </option>
                    {(canPublish || guide.status === "published") && (
                      <option value="published" disabled={!canPublish}>
                        {labels.published}
                      </option>
                    )}
                  </select>
                </td>
                <td>
                  <div className="table-actions">
                    <Link href={`/admin/guides/${guide.id}`}>Éditer</Link>
                    <button
                      type="button"
                      onClick={() => toggle(guide.id, !guide.active)}
                    >
                      {guide.active ? "Désactiver" : "Activer"}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        className="danger-action"
                        onClick={() => remove(guide)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
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
