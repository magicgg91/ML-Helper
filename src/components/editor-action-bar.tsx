"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { SaveTone } from "./use-save-status";

export function EditorActionBar({
  backHref,
  children,
  message,
  // Bloc 93/M1: the bar used to render every message in one neutral style, so
  // "Enregistré" and "Erreur serveur" were visually identical. Defaults to
  // that neutral style for callers that pass no tone.
  tone = "idle",
}: {
  backHref: string;
  children: ReactNode;
  message: string;
  tone?: SaveTone;
}) {
  const t = useTranslations("admin.common");
  return (
    <div className="editor-action-bar">
      <Link className="editor-back-action" href={backHref}>
        ← {t("back")}
      </Link>
      <div className="editor-action-buttons">{children}</div>
      {message && (
        <p
          className={`editor-action-message editor-action-message-${tone}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
