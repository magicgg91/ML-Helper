"use client";

import { useId, type Ref } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { widthClasses, type NumberFieldWidth } from "./admin-number-field";

/**
 * Bloc 145 : le champ de l'administration pour une valeur qui n'est pas un
 * nombre.
 *
 * `NumberField` ne pouvait pas servir : il lit ce qu'on tape avec
 * `parseAdminNumber` et ne rend à son appelant qu'un `number | null`, donc une
 * plage comme « 150-200 » n'en ressortirait jamais entière. Celui-ci rend le
 * texte tel quel et laisse l'écran décider de ce qu'il vaut — c'est ce que
 * demande une saisie dont la grammaire appartient au domaine, pas au champ.
 *
 * Tout le reste est repris de son voisin, délibérément : mêmes classes, mêmes
 * largeurs, même traitement du refus (contour à l'encre du message, message
 * sous le champ, `aria-invalid` et `aria-describedby`), même `fieldRef` pour
 * que l'écran puisse y poser le curseur. Deux champs qui se ressemblent à
 * l'œil doivent se ressembler au clavier et au lecteur d'écran.
 */
export function TextField({
  label,
  value,
  onChange,
  width = "m",
  placeholder,
  inputMode,
  hideLabel = false,
  invalid,
  invalidMessage,
  fieldRef,
  testId,
}: {
  /** Le nom accessible. `hideLabel` le sort de l'écran, jamais de l'arbre. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  width?: NumberFieldWidth;
  placeholder?: string;
  /**
   * Le clavier mobile à ouvrir. « numeric » n'offre pas de tiret : il ne
   * convient qu'à un champ dont la saisie ne peut pas en porter.
   */
  inputMode?: "text" | "numeric";
  hideLabel?: boolean;
  invalid?: boolean;
  /** Ce que la validation de l'écran reproche au champ, sous lui. */
  invalidMessage?: string;
  fieldRef?: Ref<HTMLInputElement>;
  testId?: string;
}) {
  const t = useTranslations("admin.editor");
  const id = useId();

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
      <input
        id={id}
        className={cn(
          "admin-control admin-focus h-9 rounded-admin-control border bg-admin-card px-2 text-right text-sm text-admin-text tabular-nums",
          widthClasses[width],
          invalid
            ? "border-admin-danger-ink text-admin-danger-ink"
            : value.trim() === ""
              ? "border-dashed border-admin-warn-ink/60"
              : "border-admin-card-border",
        )}
        ref={fieldRef}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        aria-describedby={invalidMessage ? `${id}-error` : undefined}
        placeholder={placeholder ?? t("to-fill-in")}
        value={value}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      />
      {invalidMessage && (
        <span className="text-xs text-admin-danger-ink" id={`${id}-error`}>
          {invalidMessage}
        </span>
      )}
    </div>
  );
}
