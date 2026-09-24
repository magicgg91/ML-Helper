"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { AdminButton } from "./admin-button";
import { AdminOverlay } from "./admin-overlay";

/**
 * Bloc 119: the drawer that opens from the right for a short form — creating
 * a user, without leaving the list behind it.
 *
 * The footer is a slot rather than a fixed pair of buttons: a creation panel
 * submits a form, a detail panel may only have a way out.
 */
export function SidePanel({
  open,
  title,
  description,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("admin.common");
  const titleId = useId();
  return (
    <AdminOverlay
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      placement="right"
      layer="drawer"
      className="flex h-full w-full max-w-md flex-col border-l border-admin-card-border"
    >
      <div className="flex items-start justify-between gap-4 border-b border-admin-rule px-6 py-5">
        <div>
          <h2 id={titleId} className="admin-section-title">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-admin-dim">{description}</p>
          )}
        </div>
        <AdminButton
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("close")}
          onClick={onClose}
        >
          <XIcon aria-hidden="true" />
        </AdminButton>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-admin-rule px-6 py-4">
          {footer}
        </div>
      )}
    </AdminOverlay>
  );
}
