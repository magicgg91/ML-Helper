"use client";

import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Bloc 119 §3 bis: a named group of rows that folds — an equipment set, a
 * shop category, an event and its tiers.
 *
 * The chevron is the button and carries `aria-expanded`, so the whole header
 * strip opens the group; the actions on the right sit outside it, because a
 * nested button inside a button is not a thing the browser will render.
 */
export function CollapsibleGroup({
  title,
  open,
  onToggle,
  badges,
  count,
  actions,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  /** Family, rarity, "3 valeurs à confirmer" — chips beside the name. */
  badges?: ReactNode;
  /** How many rows are inside, shown whether the group is open or not. */
  count?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="overflow-hidden rounded-admin-card border border-admin-card-border">
      <div className="flex flex-wrap items-center gap-2 bg-admin-head px-3 py-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          className="admin-focus flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onToggle(!open)}
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-admin-dim transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="admin-section-title truncate text-admin-text">
            {title}
          </span>
          {badges}
          {count !== undefined && (
            <span className="text-xs text-admin-dim">{count}</span>
          )}
        </button>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      <div hidden={!open} id={id}>
        {children}
      </div>
    </div>
  );
}
