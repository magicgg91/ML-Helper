"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

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
export function GuideStatusList({
  rows,
  canPublish,
  canDelete,
  canWrite,
}: {
  rows: GuideAdminRow[];
  canPublish: boolean;
  canDelete: boolean;
  canWrite: boolean;
}) {
  const t = useTranslations("admin.guides");
  const [guides, setGuides] = useState(rows);
  const [message, setMessage] = useState("");
  async function changeStatus(id: string, status: string) {
    const response = await fetch(`/api/admin/guides/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok)
      return setMessage(t("status-forbidden"));
    setGuides((current) =>
      current.map((guide) => (guide.id === id ? { ...guide, status } : guide)),
    );
    setMessage(t("status-saved"));
  }
  async function toggle(id: string, active: boolean) {
    const response = await fetch(`/api/admin/guides/${id}/active`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!response.ok)
      return setMessage(t("visibility-error"));
    setGuides((current) =>
      current.map((guide) => (guide.id === id ? { ...guide, active } : guide)),
    );
    setMessage(t(active ? "enabled" : "disabled"));
  }
  async function remove(guide: GuideAdminRow) {
    if (
      !window.confirm(t("confirm-delete", { title: guide.title }))
    )
      return;
    const response = await fetch(`/api/admin/guides/${guide.id}`, {
      method: "DELETE",
    });
    if (!response.ok)
      return setMessage(t("delete-forbidden"));
    setGuides((current) => current.filter((item) => item.id !== guide.id));
    setMessage(t("deleted"));
  }
  return (
    <>
      <div className="ranking-table-wrap">
        <table className="ranking-table guide-admin-table">
          <thead>
            <tr>
              <th>{t("columns.title")}</th>
              <th>{t("columns.author")}</th>
              <th>{t("columns.created")}</th>
              <th>{t("columns.updated")}</th>
              <th>{t("columns.status")}</th>
              <th>{t("columns.actions")}</th>
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
                    : t("disabled-tooltip")
                }
              >
                <td>{guide.title || guide.slug}</td>
                <td>{guide.author}</td>
                <td>{guide.createdAt}</td>
                <td>{guide.updatedAt}</td>
                <td>
                  <select
                    aria-label={t("status-label", { title: guide.title || guide.slug })}
                    value={guide.status}
                    disabled={!canWrite}
                    onChange={(event) =>
                      changeStatus(guide.id, event.target.value)
                    }
                  >
                    <option value="draft">{t("statuses.draft")}</option>
                    <option value="pending_review">
                      {t("statuses.pending_review")}
                    </option>
                    {(canPublish || guide.status === "published") && (
                      <option value="published" disabled={!canPublish}>
                        {t("statuses.published")}
                      </option>
                    )}
                  </select>
                </td>
                <td>
                  <div className="table-actions">
                    {canWrite && (
                      <Link href={`/admin/guides/${guide.id}`}>{t("edit")}</Link>
                    )}
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => toggle(guide.id, !guide.active)}
                      >
                        {t(guide.active ? "disable" : "enable")}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="danger-action"
                        onClick={() => remove(guide)}
                      >
                        {t("delete")}
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
