"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./admin-confirm-dialog";

/**
 * Bloc 119: the audit log's purge, moved to the bottom of the screen in a
 * card of its own with a danger border — it used to sit above the log, the
 * first thing an administrator met.
 *
 * Bloc 136 : la carte, le titre et la ligne de description sont désormais
 * ceux de CollapsibleSection (en ton `danger`, qui reprend le trait rouge),
 * et ce composant n'est plus que le contenu du panneau. Une action qui
 * détruit se replie comme le reste, et demande donc un geste de plus avant
 * d'atteindre le bouton — ce qui n'est pas un mal ici.
 *
 * The dialog announces the exact number of entries the period holds, asked
 * of the server before anything is deleted: the screen only ever holds one
 * page of the log, so it cannot count them itself.
 *
 * The purge writes its own entry in the history (the route does, with the
 * author, the period and the number deleted), so the one action that erases
 * the record leaves a trace of itself.
 */
export function AdminLogsPurge() {
  const t = useTranslations("admin.logs");
  const router = useRouter();
  const startId = useId();
  const endId = useId();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pending, setPending] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function askForCount() {
    setMessage("");
    if (!start || !end || new Date(start) > new Date(end))
      return setMessage(t("purge-invalid-range"));
    const response = await fetch(
      `/api/admin/logs/count?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    ).catch(() => null);
    if (!response?.ok) return setMessage(t("error"));
    const { count } = (await response.json()) as { count: number };
    setPending(count);
  }

  async function purge() {
    setBusy(true);
    const response = await fetch("/api/admin/logs", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ start, end }),
    }).catch(() => null);
    setBusy(false);
    setPending(undefined);
    if (!response?.ok) return setMessage(t("error"));
    const { deleted } = (await response.json()) as { deleted: number };
    setMessage(t("purged-count", { count: deleted }));
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-admin-dim">
          {t("start")}
          <input
            id={startId}
            type="datetime-local"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="admin-control admin-focus h-[var(--admin-control-h)] rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-sm text-admin-text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-admin-dim">
          {t("end")}
          <input
            id={endId}
            type="datetime-local"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="admin-control admin-focus h-[var(--admin-control-h)] rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-sm text-admin-text"
          />
        </label>
        <AdminButton type="button" variant="danger" onClick={askForCount}>
          {t("purge-open")}
        </AdminButton>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-admin-dim">
          {message}
        </p>
      )}
      <ConfirmDialog
        open={pending !== undefined}
        title={t("purge-confirm-title")}
        description={t("purge-confirm-body", { count: pending ?? 0 })}
        confirmLabel={t("purge-confirm-action")}
        busy={busy}
        onCancel={() => setPending(undefined)}
        onConfirm={purge}
      />
    </>
  );
}
