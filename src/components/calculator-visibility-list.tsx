"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type CalculatorRow = {
  id: string;
  slug: string;
  label: string;
  active: boolean;
  editHref: string;
};

export function CalculatorVisibilityList({
  rows,
  canToggle = true,
}: {
  rows: CalculatorRow[];
  canToggle?: boolean;
}) {
  const t = useTranslations("admin.tools");
  const [calculators, setCalculators] = useState(rows);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string>();

  async function toggle(row: CalculatorRow) {
    setSaving(row.id);
    setMessage(t("saving"));
    try {
      const response = await fetch(`/api/admin/tools/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      if (!response.ok) {
        setMessage(t("save-error", { status: response.status }));
        return;
      }
      setCalculators((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, active: !item.active } : item,
        ),
      );
      setMessage(
        t("state-saved", {
          tool: row.label,
          state: t(row.active ? "inactive" : "active").toLocaleLowerCase(),
        }),
      );
    } catch {
      setMessage(t("server-error"));
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
              <th>{t("columns.tool")}</th>
              <th>{t("columns.status")}</th>
              <th>{t("columns.action")}</th>
            </tr>
          </thead>
          <tbody>
            {calculators.map((row) => (
              <tr
                className={row.active ? undefined : "calculator-row-disabled"}
                key={row.id}
                title={
                  row.active
                    ? undefined
                    : t("disabled-tooltip")
                }
              >
                <td>{row.label}</td>
                <td
                  className={row.active ? "status-active" : "status-inactive"}
                >
                  {t(row.active ? "active" : "inactive")}
                </td>
                <td>
                  <div className="table-actions">
                  <Link href={row.editHref}>{t("edit")}</Link>
                  {canToggle && (
                    <button
                      className="secondary-action"
                      type="button"
                      disabled={saving === row.id}
                      onClick={() => toggle(row)}
                    >
                      {t(row.active ? "disable" : "enable")}
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
