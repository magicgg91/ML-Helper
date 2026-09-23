"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AdminButton } from "./admin-button";
import { Pill } from "./admin-pill";
import { useUnsavedWarning } from "./use-unsaved-warning";

/**
 * Bloc 119 §3 bis: the top of every edit screen.
 *
 * It replaces EditorActionBar, which gave a back link and a save button but
 * never said whether there was anything to save. Three things change:
 *  - the trail says where you came from and what you are editing;
 *  - the state is explicit — "Modifications non enregistrées" with a way back
 *    to the stored values, or "✓ Tout est enregistré";
 *  - **one** save button per screen, which is the rule the Templiers screen
 *    broke with its two.
 *
 * `onCancel` is what returns the form to what the server holds; the header
 * does not own the form's state, only the question of whether it differs.
 */
export function EditorHeader({
  backHref,
  backLabel,
  title,
  description,
  pills,
  dirty,
  saving = false,
  onSave,
  onCancel,
  message,
}: {
  backHref: string;
  /** The list this screen hangs off — "Outils", "Référentiels", "Guides". */
  backLabel: string;
  title: string;
  description?: ReactNode;
  /** Cross-links and counters: "Utilisé par l'outil X". */
  pills?: ReactNode;
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
  /** The save's own word, from useSaveStatus. */
  message?: string;
}) {
  const t = useTranslations("admin.editor");
  useUnsavedWarning(dirty, t("leave-warning"));

  return (
    <header className="flex flex-col gap-4">
      <nav aria-label={t("breadcrumb")} className="text-sm">
        <Link
          className="admin-focus text-admin-dim hover:text-admin-accent-soft-ink hover:underline"
          href={backHref}
        >
          ← {backLabel}
        </Link>
        {/* The spaces are inside the separator on purpose: the trail is one
            line of text when copied, not "Outils/Classement". */}
        <span aria-hidden="true" className="text-admin-dim">
          {" / "}
        </span>
        <span className="font-semibold text-admin-text">{title}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="admin-title text-admin-text">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-admin-dim">
              {description}
            </p>
          )}
          {pills && <div className="mt-3 flex flex-wrap gap-2">{pills}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <>
              <Pill tone="warn">{t("unsaved")}</Pill>
              <AdminButton type="button" onClick={onCancel} disabled={saving}>
                {t("cancel")}
              </AdminButton>
            </>
          ) : (
            <Pill tone="ok">{`✓ ${t("all-saved")}`}</Pill>
          )}
          <AdminButton
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={saving}
          >
            {t("save")}
          </AdminButton>
        </div>
      </div>
      {message && (
        <p className="text-sm text-admin-dim" role="status">
          {message}
        </p>
      )}
    </header>
  );
}
