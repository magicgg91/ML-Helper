"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Bloc 119: the one control that says whether something is on the public site.
 *
 * It replaces the ⏻ button the list screens used, which read as "delete" to
 * more than one person and gave no state until you hovered it. A real
 * `role="switch"` announces its state to a screen reader, and the word next
 * to it does the same for everyone else.
 *
 * Presentational on purpose: the caller owns the request, the optimistic
 * update and the failure message, because what "visible" persists to differs
 * per screen (a calculator's `active`, a guide's status, a locale's flag).
 */
export function VisibilitySwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /**
   * What this switch controls, spelled out: "Visibilité de Coût de Ville".
   * A row of identical "Visible" switches is unusable by voice or by screen
   * reader without it, so it is required rather than optional.
   */
  label: string;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.common");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "admin-focus inline-flex h-[var(--admin-switch-h)] w-[var(--admin-switch-w)] shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "border-admin-accent bg-admin-accent"
            : "border-admin-card-border bg-admin-neutral",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "mx-[3px] block size-[18px] rounded-full bg-admin-card transition-transform",
            checked && "translate-x-[16px]",
          )}
        />
      </button>
      {/* The state is already on the button (aria-checked); this repeats it
          for the eye, so it is hidden from the screen reader rather than
          read twice. */}
      <span aria-hidden="true" className="text-xs font-semibold">
        {checked ? t("visible") : t("hidden")}
      </span>
    </span>
  );
}
