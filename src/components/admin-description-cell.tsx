"use client";

import { useTranslations } from "next-intl";
import type { ToolDescription } from "@/lib/tool-description";
import { launchLocales } from "@/lib/translations";
import { AdminButton } from "./admin-button";
import { Pill } from "./admin-pill";

/**
 * Bloc 130: the Description cell of the Outils and Référentiels tables.
 *
 * It says how many languages the description is written in, because that is
 * the question the column exists to answer — an empty description on a
 * visible tool is a gap, and a count makes it visible without opening
 * anything. A role that may not write sees the count without the button,
 * the same way the rest of both tables treat a reader.
 */
export function DescriptionCell({
  row,
  canEdit,
  onOpen,
}: {
  row: { label: string; description: ToolDescription };
  canEdit: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations("admin.descriptions");
  const written = launchLocales.filter((locale) =>
    (row.description[locale] ?? "").trim(),
  ).length;
  const count = (
    <Pill tone={written === 0 ? "warn" : "neutral"}>
      {t("written", { count: written })}
    </Pill>
  );
  if (!canEdit) return count;
  return (
    <span className="inline-flex items-center gap-2">
      {count}
      <AdminButton
        type="button"
        size="sm"
        aria-label={t("open", { name: row.label })}
        onClick={onOpen}
      >
        {t("column")}
      </AdminButton>
    </span>
  );
}
