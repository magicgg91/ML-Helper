"use client";

import { useId, useState, type Ref } from "react";
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
  invalid,
  invalidMessage,
  fieldRef,
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
  /**
   * Bloc 131/C : refusé par la validation de l'écran, alors que le champ
   * lui-même sait lire ce qu'il contient — un seuil à 150 est un nombre
   * parfaitement lisible, et hors de la plage permise. Le champ portait déjà
   * l'état « illisible » ; celui-ci le rejoint et prend la même apparence,
   * plutôt qu'une seconde façon de dire qu'un champ ne va pas.
   */
  invalid?: boolean;
  /** Ce que la validation reproche au champ, sous lui. */
  invalidMessage?: string;
  /** Pour que l'écran puisse y amener le curseur après un refus. */
  fieldRef?: Ref<HTMLInputElement>;
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
  // Illisible ici, refusé par l'écran : deux raisons, un seul état visible.
  // Ce que le champ constate lui-même passe devant ce qu'on lui reproche —
  // un texte qui n'est pas un nombre n'a pas de valeur à juger.
  const wrong = unreadable || Boolean(invalid);
  const problem = unreadable ? t("not-a-number") : invalidMessage;

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
              : // Bloc 131/C : le contour d'un champ refusé prend l'encre du
                // message, pas la bordure des cartes danger. Mesuré sur fond
                // blanc : `--admin-danger-border` (#e6bfb5) donne 1,7:1 avec
                // le fond, sous le plancher de 3:1 du WCAG 1.4.11 pour ce
                // qui identifie l'état d'un composant ; `--admin-danger-ink`
                // (#9a2f1c) donne 7,5:1. Un contour qu'on doit chercher
                // n'est pas un contour.
                wrong
                ? "border-admin-danger-ink text-admin-danger-ink"
                : empty
                  ? "border-dashed border-admin-warn-ink/60"
                  : "border-admin-card-border",
          )}
          ref={fieldRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={wrong || undefined}
          // The unit is described, not named: "Coût 92 saphirs" would read as
          // part of the value, while a description says what the number is
          // counted in.
          aria-describedby={
            [problem ? `${id}-error` : "", unit ? `${id}-unit` : ""]
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
      {problem && (
        <span className="text-xs text-admin-danger-ink" id={`${id}-error`}>
          {problem}
        </span>
      )}
    </div>
  );
}
