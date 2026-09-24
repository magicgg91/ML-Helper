"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "./use-focus-trap";

/**
 * Bloc 119: what the admin's three overlays have in common — the confirmation
 * dialog, the side panel, and the sidebar drawer below 1024 px.
 *
 * Each one is a modal surface over a dimmed page: same ARIA (`role="dialog"`,
 * `aria-modal`, a heading it is named by), same trapped keyboard, same two
 * ways out (Escape, a click on the backdrop). Only the shape differs, which
 * is what `placement` carries.
 */
export function AdminOverlay({
  open,
  onClose,
  labelledBy,
  describedBy,
  placement = "center",
  layer = "dialog",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Id of the heading inside — every dialog is named by what it is about. */
  labelledBy: string;
  describedBy?: string;
  placement?: "center" | "right" | "left";
  /**
   * Bloc 125 §3: which step of the admin's z-index scale this surface sits
   * on. A drawer is a place you work in; a dialog is a question asked *about*
   * that work, so it has to come out above it — deleting a user is confirmed
   * over the panel that lists them.
   */
  layer?: "drawer" | "dialog";
  className?: string;
  children: ReactNode;
}) {
  const dialog = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 flex bg-black/40",
        layer === "drawer" ? "z-[var(--z-drawer)]" : "z-[var(--z-dialog)]",
        placement === "center" && "items-center justify-center p-4",
        placement === "right" && "justify-end",
        placement === "left" && "justify-start",
      )}
      // mousedown, not click: a drag that starts inside the panel and ends on
      // the backdrop is not a click on the backdrop, and closing there would
      // throw away what was being selected.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn(
          "bg-admin-card text-admin-text shadow-xl outline-none",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
