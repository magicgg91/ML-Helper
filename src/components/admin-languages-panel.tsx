"use client";

import { LockIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DataTable, type AdminTableColumn } from "./admin-data-table";
import { Pill, type PillTone } from "./admin-pill";
import { VisibilitySwitch } from "./admin-visibility-switch";

/**
 * Bloc 119: the language table of the Configuration screen.
 *
 * The column it gains is the one that makes the switch answerable: how many
 * guides are actually translated into that language. Turning a language on
 * with nothing written in it is a decision; it should not be one taken
 * blindly.
 *
 * EN and FR keep their padlock: they are the site's base languages, never
 * deactivatable (Bloc 90, guardrail D), and the API refuses it too.
 */

export type LanguageRow = {
  locale: string;
  active: boolean;
  locked: boolean;
  /** How many guides carry a version in this language, out of how many. */
  translated: number;
  total: number;
};

export function AdminLanguagesPanel({ rows }: { rows: LanguageRow[] }) {
  const t = useTranslations("admin.config");
  // Language names come from next-intl like every other fixed UI string
  // (AGENTS.md) — the values are endonyms, so they read the same in every
  // admin UI locale, but they still flow through the translation files.
  const languageName = (locale: string) =>
    t.has(`languages.${locale}`)
      ? t(`languages.${locale}`)
      : locale.toUpperCase();
  const router = useRouter();
  const [languages, setLanguages] = useState(rows);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string>();

  async function toggle(row: LanguageRow, next: boolean) {
    setSaving(row.locale);
    setMessage(t("saving"));
    try {
      const response = await fetch("/api/admin/config/locales", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: row.locale, active: next }),
      });
      if (!response.ok) {
        setMessage(t("save-error", { status: response.status }));
        return;
      }
      setLanguages((current) =>
        current.map((item) =>
          item.locale === row.locale ? { ...item, active: next } : item,
        ),
      );
      setMessage(
        t("state-saved", {
          language: languageName(row.locale),
          state: t(next ? "active" : "inactive").toLocaleLowerCase(),
        }),
      );
      /**
       * Revue Codex (PR #156) : le tableau se met à jour tout seul, mais le
       * résumé de la section — « n actives sur 5 » — est calculé sur le
       * serveur, et resterait sur son ancien compte jusqu'au prochain
       * chargement. On redemande donc l'écran, comme la purge du journal le
       * fait déjà après coup.
       */
      router.refresh();
    } catch {
      setMessage(t("server-error"));
    } finally {
      setSaving(undefined);
    }
  }

  const translationTone = (row: LanguageRow): PillTone =>
    row.translated === 0
      ? "neutral"
      : row.translated === row.total
        ? "ok"
        : "warn";

  const columns: AdminTableColumn<LanguageRow>[] = [
    {
      key: "language",
      header: t("columns.language"),
      cell: (row) => (
        <span className="flex items-center gap-2">
          {/* The language code is one of the three places monospace is
              allowed (§1). */}
          <span className="font-admin-mono text-xs text-admin-dim">
            {row.locale.toUpperCase()}
          </span>
          <span className="font-semibold">{languageName(row.locale)}</span>
        </span>
      ),
    },
    {
      key: "translated",
      header: t("columns-translated"),
      cell: (row) =>
        row.total === 0 ? (
          <span className="text-admin-dim">{t("no-guides")}</span>
        ) : (
          <Pill tone={translationTone(row)}>
            {`${row.translated} / ${row.total}`}
          </Pill>
        ),
    },
    {
      key: "public",
      header: t("columns-public"),
      narrow: true,
      cell: (row) =>
        row.locked ? (
          <span
            className="inline-flex items-center gap-2 text-sm text-admin-dim"
            data-testid={`locale-locked-${row.locale}`}
          >
            <LockIcon aria-hidden="true" className="size-4" />
            {t("always-active")}
          </span>
        ) : (
          <VisibilitySwitch
            checked={row.active}
            disabled={saving === row.locale}
            testId={`locale-toggle-${row.locale}`}
            labels={{ on: t("active"), off: t("inactive") }}
            label={t("visibility-of", { language: languageName(row.locale) })}
            onChange={(next) => toggle(row, next)}
          />
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-admin-card border border-admin-card-border">
        <DataTable
          caption={t("languages-section")}
          columns={columns}
          rows={languages}
          rowKey={(row) => row.locale}
          empty={t("no-guides")}
          density="edit"
        />
      </div>
      {message && (
        <p className="text-sm text-admin-dim" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
