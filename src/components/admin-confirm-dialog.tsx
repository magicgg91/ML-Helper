"use client";

import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { AdminButton } from "./admin-button";
import { AdminOverlay } from "./admin-overlay";

/**
 * Bloc 119: the confirmation every destructive action goes through — deleting
 * a guide or a user, purging a period of the audit log.
 *
 * The cancel button comes first in the DOM, so it is what the focus trap
 * lands on when the dialog opens: on a dialog that can destroy data, a
 * reflex Enter must not be the one that does it.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  /** What exactly is about to happen — "42 entrées seront supprimées". */
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "accent";
  /** While the request is in flight: both buttons refuse a second click. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("admin.common");
  const titleId = useId();
  const descriptionId = useId();
  return (
    <AdminOverlay
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={descriptionId}
      className="w-full max-w-md rounded-admin-card border border-admin-card-border p-6"
    >
      <h2 id={titleId} className="admin-section-title">
        {title}
      </h2>
      <div id={descriptionId} className="mt-2 text-sm text-admin-dim">
        {description}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <AdminButton type="button" onClick={onCancel} disabled={busy}>
          {cancelLabel ?? t("cancel")}
        </AdminButton>
        <AdminButton
          type="button"
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel ?? t("confirm")}
        </AdminButton>
      </div>
    </AdminOverlay>
  );
}
