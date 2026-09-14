"use client";

import { Pencil, Power } from "lucide-react";
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

export type ReferenceAdminRow = {
  id: string;
  slug: string;
  title: string;
  active: boolean;
  editHref?: string;
  // Templars'/Gems' active state is the same Calculator row shown in the
  // Outils table — when a row's toggle is gated elsewhere (canToggle:
  // false) or submitted through a different endpoint (toggleHref), those
  // override the defaults below. Neither is set by today's production
  // rows (Bloc 33/G/36/A moved every reference onto the same generic
  // references.write toggle) but the escape hatch stays available.
  canToggle?: boolean;
  toggleHref?: string;
};

export function ReferenceStatusList({
  rows,
  canWrite,
}: {
  rows: ReferenceAdminRow[];
  canWrite: boolean;
}) {
  const t = useTranslations("admin.referentiels");
  const [references, setReferences] = useState(rows);
  const [message, setMessage] = useState("");
  async function toggle(reference: ReferenceAdminRow) {
    const active = !reference.active;
    const response = await fetch(
      reference.toggleHref ??
        `/api/admin/guides/references/${reference.id}/active`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active }),
      },
    );
    if (!response.ok) return setMessage(t("visibility-error"));
    setReferences((current) =>
      current.map((item) =>
        item.id === reference.id ? { ...item, active } : item,
      ),
    );
    setMessage(t(active ? "enabled" : "disabled"));
  }
  return (
    <>
      {references.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("no-results")}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.title")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("columns.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {references.map((reference) => (
                  <TableRow
                    key={reference.id}
                    className={reference.active ? undefined : "opacity-60"}
                    title={reference.active ? undefined : t("disabled-tooltip")}
                  >
                    <TableCell className="font-medium">
                      {reference.title || reference.slug}
                    </TableCell>
                    <TableCell>
                      {t(
                        reference.active
                          ? "statuses.active"
                          : "statuses.inactive",
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {canWrite && reference.editHref && (
                          <Button
                            asChild
                            size="icon"
                            variant="secondary"
                            title={t("edit")}
                          >
                            <Link
                              href={reference.editHref}
                              aria-label={t("edit")}
                            >
                              <Pencil aria-hidden="true" />
                            </Link>
                          </Button>
                        )}
                        {canWrite && (reference.canToggle ?? true) && (
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => toggle(reference)}
                            title={t(reference.active ? "disable" : "enable")}
                            aria-label={t(
                              reference.active ? "disable" : "enable",
                            )}
                          >
                            <Power aria-hidden="true" />
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
