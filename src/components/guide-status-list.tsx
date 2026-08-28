"use client";

import { Pencil, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type GuideAdminRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  active: boolean;
  type?: "guide" | "reference";
  editHref?: string;
  // Templars' active state is the same Calculator row shown in the Outils
  // table — its toggle button is gated on calculators.toggle (canToggle)
  // and, when shown, submitted through toggleHref (the /admin/tools route,
  // by calculator id) instead of the guides/references route below.
  canToggle?: boolean;
  toggleHref?: string;
};
export function GuideStatusList({
  rows,
  canPublish,
  canDelete,
  canWrite,
  newHref,
}: {
  rows: GuideAdminRow[];
  canPublish: boolean;
  canDelete: boolean;
  canWrite: boolean;
  newHref?: string;
}) {
  const t = useTranslations("admin.guides");
  const [guides, setGuides] = useState(rows);
  const [message, setMessage] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "guide" | "reference">(
    "all",
  );
  const visibleGuides =
    typeFilter === "all"
      ? guides
      : guides.filter((guide) => (guide.type ?? "guide") === typeFilter);
  async function changeStatus(id: string, status: string) {
    const response = await fetch(`/api/admin/guides/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return setMessage(t("status-forbidden"));
    setGuides((current) =>
      current.map((guide) => (guide.id === id ? { ...guide, status } : guide)),
    );
    setMessage(t("status-saved"));
  }
  async function toggle(guide: GuideAdminRow) {
    const active = !guide.active;
    const response = await fetch(
      guide.toggleHref ??
        (guide.type === "reference"
          ? `/api/admin/guides/references/${guide.id}/active`
          : `/api/admin/guides/${guide.id}/active`),
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active }),
      },
    );
    if (!response.ok) return setMessage(t("visibility-error"));
    setGuides((current) =>
      current.map((item) =>
        item.id === guide.id ? { ...item, active } : item,
      ),
    );
    setMessage(t(active ? "enabled" : "disabled"));
  }
  async function remove(guide: GuideAdminRow) {
    if (!window.confirm(t("confirm-delete", { title: guide.title }))) return;
    const response = await fetch(`/api/admin/guides/${guide.id}`, {
      method: "DELETE",
    });
    if (!response.ok) return setMessage(t("delete-forbidden"));
    setGuides((current) => current.filter((item) => item.id !== guide.id));
    setMessage(t("deleted"));
  }
  return (
    <>
      <div className="admin-section-heading">
        <div
          role="group"
          aria-label={t("filter-type-label")}
          className="family-buttons"
        >
          {(["all", "guide", "reference"] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={typeFilter === type}
              onClick={() => setTypeFilter(type)}
            >
              {t(`types.${type}`)}
            </button>
          ))}
        </div>
        {newHref && (
          <Link className="editor-action editor-action-primary" href={newHref}>
            {t("new")}
          </Link>
        )}
      </div>
      {visibleGuides.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("no-results")}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.title")}</TableHead>
                  <TableHead>{t("columns.type")}</TableHead>
                  <TableHead>{t("columns.author")}</TableHead>
                  <TableHead>{t("columns.created")}</TableHead>
                  <TableHead>{t("columns.updated")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("columns.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleGuides.map((guide) => (
                  <TableRow
                    key={guide.id}
                    className={guide.active ? undefined : "opacity-60"}
                    title={guide.active ? undefined : t("disabled-tooltip")}
                  >
                    <TableCell className="font-medium">
                      {guide.title || guide.slug}
                    </TableCell>
                    <TableCell>{t(`types.${guide.type ?? "guide"}`)}</TableCell>
                    <TableCell>{guide.author}</TableCell>
                    <TableCell>{guide.createdAt}</TableCell>
                    <TableCell>{guide.updatedAt}</TableCell>
                    <TableCell>
                      {guide.type === "reference" ? (
                        t(
                          guide.active
                            ? "statuses.active"
                            : "statuses.inactive",
                        )
                      ) : (
                        <select
                          className="h-8 rounded-md border border-border bg-transparent px-2 text-sm"
                          aria-label={t("status-label", {
                            title: guide.title || guide.slug,
                          })}
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
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {canWrite && (
                          <Button
                            asChild
                            size="icon"
                            variant="secondary"
                            title={t("edit")}
                          >
                            <Link
                              href={
                                guide.editHref ?? `/admin/guides/${guide.id}`
                              }
                              aria-label={t("edit")}
                            >
                              <Pencil aria-hidden="true" />
                            </Link>
                          </Button>
                        )}
                        {canWrite && (guide.canToggle ?? true) && (
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => toggle(guide)}
                            title={t(guide.active ? "disable" : "enable")}
                            aria-label={t(guide.active ? "disable" : "enable")}
                          >
                            <Power aria-hidden="true" />
                          </Button>
                        )}
                        {canDelete && guide.type !== "reference" && (
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => remove(guide)}
                            title={t("delete")}
                            aria-label={t("delete")}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {message && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </>
  );
}
