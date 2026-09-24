"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatAdminNumber, parseAdminNumber } from "@/lib/admin-number";
import { cn } from "@/lib/utils";

/**
 * Bloc 119: the admin's numeric field.
 *
 * It replaces `<input type="number">`, which looked right and behaved wrong
 * for game parameters: it reads a dot and refuses the comma a French admin
 * types, and — the sharp end — an entry it cannot read arrives as the empty
 * string, so `Number(event.target.value)` stored **0**. A ratio typed with a
 * comma silently became zero.
 *
 * Three states it can be in, and each one is visible:
 *  - a value;
 *  - empty, which is a real state for a game value nobody has confirmed yet
 *    (AGENTS.md: no extrapolation) — dashed amber border and "À renseigner";
 *  - unreadable, which keeps what was typed on screen and does NOT call
 *    onChange, so a typo never reaches the save.
 *
 * Figures are right-aligned and tabular (`tabular-nums`), not monospace: §1
 * of the brief reserves the mono family for hours, identifiers and language
 * codes, while §3 bis asks for monospace here — tabular figures give the
 * column alignment that was wanted, in the family §1 requires. See the PR.
 */

export type NumberFieldWidth = "s" | "m" | "l";

const widthClasses: Record<NumberFieldWidth, string> = {
  s: "w-[72px]",
  m: "w-[92px]",
  l: "w-[120px]",
};

export function NumberField({
  label,
  value,
  onChange,
  width = "m",
  unit,
  hideLabel = false,
  disabled = false,
  testId,
}: {
  /** The accessible name. `hideLabel` keeps it off screen, never unset. */
  label: string;
  value: number | null;
  /** Called only with a value the field could read — null means cleared. */
  onChange: (value: number | null) => void;
  width?: NumberFieldWidth;
  /** Shown after the field and read with it: "%", "saphirs". */
  unit?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  testId?: string;
}) {
  const t = useTranslations("admin.editor");
  const locale = useLocale();
  const id = useId();
  const [text, setText] = useState(() => formatAdminNumber(value, locale));
  // Re-seeding during render rather than in an effect: an effect would paint
  // the old text first, and this runs only when the owner really changed the
  // value under us (Annuler, a save that echoes what was stored).
  const [lastValue, setLastValue] = useState(value);
  // Object.is, not !==: a caller handing this a NaN (a field whose stored
  // text is not a number) would otherwise never compare equal to itself, and
  // the re-seed would loop forever.
  if (!Object.is(value, lastValue)) {
    setLastValue(value);
    setText(formatAdminNumber(value, locale));
  }

  const parsed = parseAdminNumber(text);
  const unreadable = !parsed.ok;
  const empty = parsed.ok && parsed.value === null;

  function change(next: string) {
    setText(next);
    const result = parseAdminNumber(next);
    if (!result.ok) return;
    setLastValue(result.value);
    onChange(result.value);
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <label
        className={cn(
          "text-xs font-medium text-admin-dim",
          hideLabel && "sr-only",
        )}
        htmlFor={id}
      >
        {label}
      </label>
      <span className="inline-flex items-center gap-1.5">
        <input
          id={id}
          className={cn(
            // `admin-control` opts the field out of the bare-element rules
            // globals.css applies site-wide (see admin.css).
            "admin-control admin-focus h-9 rounded-admin-control border bg-admin-card px-2 text-right text-sm text-admin-text tabular-nums disabled:cursor-not-allowed disabled:opacity-50",
            widthClasses[width],
            // Bloc 126/C: a disabled field is never "to be filled in". It is
            // empty because there is nothing for it to hold — the skill
            // beside it does not exist — so it keeps the plain border and
            // drops the amber dashes, which would be asking for a number
            // nobody can type.
            disabled
              ? "border-admin-card-border"
              : unreadable
                ? "border-admin-danger-border text-admin-danger-ink"
                : empty
                  ? "border-dashed border-admin-warn-ink/60"
                  : "border-admin-card-border",
          )}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={unreadable || undefined}
          // The unit is described, not named: "Coût 92 saphirs" would read as
          // part of the value, while a description says what the number is
          // counted in.
          aria-describedby={
            [unreadable ? `${id}-error` : "", unit ? `${id}-unit` : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          placeholder={disabled ? undefined : t("to-fill-in")}
          value={text}
          disabled={disabled}
          data-testid={testId}
          onChange={(event) => change(event.target.value)}
        />
        {unit && (
          <span className="text-xs text-admin-dim" id={`${id}-unit`}>
            {unit}
          </span>
        )}
      </span>
      {unreadable && (
        <span className="text-xs text-admin-danger-ink" id={`${id}-error`}>
          {t("not-a-number")}
        </span>
      )}
    </div>
  );
}
