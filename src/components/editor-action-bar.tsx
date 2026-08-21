"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function EditorActionBar({
  backHref,
  children,
  message,
}: {
  backHref: string;
  children: ReactNode;
  message: string;
}) {
  const t = useTranslations("admin.common");
  return (
    <div className="editor-action-bar">
      <Link className="editor-back-action" href={backHref}>
        ← {t("back")}
      </Link>
      <div className="editor-action-buttons">{children}</div>
      {message && (
        <p className="editor-action-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
