import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/**
 * Bloc 119 §3 bis: the formula an editor's numbers feed, in a frame of its
 * own instead of the loose sentence it used to be.
 *
 * It is the one place monospace still earns its keep outside hours and
 * identifiers: an expression is code, and reads as code.
 *
 * This is admin-only by construction — the public side never shows an
 * expression, only results (AGENTS.md, règles produit).
 */
export function FormulaBox({
  children,
  note,
}: {
  /** The expression itself — "coût(n) = base × ratio^n". */
  children: ReactNode;
  /** A line under it: "à partir du niveau 2". */
  note?: ReactNode;
}) {
  const t = useTranslations("admin.editor");
  return (
    <div className="rounded-admin-card border border-admin-formula-border bg-admin-formula p-4">
      <p className="admin-eyebrow text-admin-accent-soft-ink">{t("formula")}</p>
      <p className="mt-1.5 font-admin-mono text-sm text-admin-text">
        {children}
      </p>
      {note && <p className="mt-1.5 text-xs text-admin-dim">{note}</p>}
    </div>
  );
}
