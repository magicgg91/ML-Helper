"use client";

import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminButton } from "./admin-button";

/**
 * Bloc 119 §3 bis: move up, move down, remove — the three actions an editable
 * row has, always in the last column and always in that order.
 *
 * ↑ is disabled on the first row and ↓ on the last, rather than hidden: a
 * control that disappears shifts every other one under the pointer.
 *
 * `name` is what the buttons announce ("Monter Bronze"), so a screen reader
 * hears which row it is about — with a dozen identical ↑ on a screen, the
 * icon's own name is not enough.
 */
export function RowActions({
  name,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
  disabled = false,
}: {
  name: string;
  /** Omitted when the rows have no order to change. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.editor");
  return (
    <div className="flex items-center justify-end gap-1">
      {onMoveUp && (
        <AdminButton
          type="button"
          variant="ghost"
          size="icon"
          className="size-[30px]"
          aria-label={t("move-up-of", { name })}
          disabled={disabled || isFirst}
          onClick={onMoveUp}
        >
          <ArrowUpIcon aria-hidden="true" />
        </AdminButton>
      )}
      {onMoveDown && (
        <AdminButton
          type="button"
          variant="ghost"
          size="icon"
          className="size-[30px]"
          aria-label={t("move-down-of", { name })}
          disabled={disabled || isLast}
          onClick={onMoveDown}
        >
          <ArrowDownIcon aria-hidden="true" />
        </AdminButton>
      )}
      {onRemove && (
        <AdminButton
          type="button"
          variant="ghost"
          size="icon"
          className="size-[30px] text-admin-danger-ink hover:bg-admin-warn"
          aria-label={t("remove-of", { name })}
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2Icon aria-hidden="true" />
        </AdminButton>
      )}
    </div>
  );
}
