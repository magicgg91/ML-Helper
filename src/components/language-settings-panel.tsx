"use client";

import { Lock, Power } from "lucide-react";
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

export type LanguageRow = {
  locale: string;
  active: boolean;
  // EN/FR: always active, never deactivatable (guardrail D) — the toggle is
  // rendered disabled and the API rejects a deactivation too.
  locked: boolean;
};

export function LanguageSettingsPanel({ rows }: { rows: LanguageRow[] }) {
  const t = useTranslations("admin.config");
  // Language names come from next-intl like every other fixed UI string
  // (AGENTS.md) — the values are endonyms, so they read the same in every
  // admin UI locale, but they still flow through the translation files.
  const languageName = (locale: string) => t(`languages.${locale}`);
  const [languages, setLanguages] = useState(rows);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string>();

  async function toggle(row: LanguageRow) {
    if (row.locked) return;
    setSaving(row.locale);
    setMessage(t("saving"));
    try {
      const response = await fetch("/api/admin/config/locales", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: row.locale, active: !row.active }),
      });
      if (!response.ok) {
        setMessage(t("save-error", { status: response.status }));
        return;
      }
      setLanguages((current) =>
        current.map((item) =>
          item.locale === row.locale ? { ...item, active: !item.active } : item,
        ),
      );
      setMessage(
        t("state-saved", {
          language: languageName(row.locale),
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
                <TableHead>{t("columns.language")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.action")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {languages.map((row) => (
                <TableRow
                  key={row.locale}
                  className={row.active ? undefined : "opacity-60"}
                >
                  <TableCell className="font-medium">
                    <span
                      className="mr-2 font-mono text-xs text-muted-foreground"
                      aria-hidden="true"
                    >
                      {row.locale.toUpperCase()}
                    </span>
                    {languageName(row.locale)}
                  </TableCell>
                  <TableCell
                    className={
                      row.active ? "text-success" : "text-muted-foreground"
                    }
                  >
                    {t(row.active ? "active" : "inactive")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      {row.locked ? (
                        <Button
                          size="icon"
                          variant="outline"
                          disabled
                          title={t("locked-tooltip")}
                          aria-label={t("locked-tooltip")}
                          data-testid={`locale-locked-${row.locale}`}
                        >
                          <Lock aria-hidden="true" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={saving === row.locale}
                          onClick={() => toggle(row)}
                          title={t(row.active ? "disable" : "enable")}
                          aria-label={t(row.active ? "disable" : "enable")}
                          data-testid={`locale-toggle-${row.locale}`}
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
