"use client";

import { Pencil, Power } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
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
  canEdit = true,
}: {
  rows: CalculatorRow[];
  canToggle?: boolean;
  canEdit?: boolean;
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
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.tool")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.action")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculators.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.active ? undefined : "opacity-60"}
                  title={row.active ? undefined : t("disabled-tooltip")}
                >
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell
                    className={
                      row.active ? "text-success" : "text-muted-foreground"
                    }
                  >
                    {t(row.active ? "active" : "inactive")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <Button
                          asChild
                          size="icon"
                          variant="secondary"
                          title={t("edit")}
                        >
                          <Link href={row.editHref} aria-label={t("edit")}>
                            <Pencil aria-hidden="true" />
                          </Link>
                        </Button>
                      )}
                      {canToggle && (
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={saving === row.id}
                          onClick={() => toggle(row)}
                          title={t(row.active ? "disable" : "enable")}
                          aria-label={t(row.active ? "disable" : "enable")}
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
      {message && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </>
  );
}
