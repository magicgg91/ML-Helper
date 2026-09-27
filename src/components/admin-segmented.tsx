"use client";

import { cn } from "@/lib/utils";

/**
 * Bloc 125 §2: the segmented control — a short, closed list of options where
 * exactly one is on.
 *
 * It replaces two different pieces of markup that were saying the same thing
 * in two different ways: the sidebar's language pair, which was painted as
 * two filled violet buttons, and the Événements duration picker, which was
 * three separate buttons with no visual link between them (§6). A segment is
 * a track with one raised option in it, which is what "one of these" looks
 * like; a filled button is what "press me" looks like.
 *
 * `aria-pressed` and not `role="radiogroup"`: these are buttons that act on
 * the click, not a field whose value is submitted later — the same
 * distinction LangTabs draws. The group carries the label.
 */
export function AdminSegmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  optionLabel,
  fill = false,
  className,
}: {
  options: readonly T[];
  value: T;
  onChange: (option: T) => void;
  /** Names the group: "Langue", "Durée". */
  label: string;
  disabled?: boolean;
  /** What each option reads as; the option itself when left out. */
  optionLabel?: (option: T) => string;
  /**
   * Bloc 141 : le groupe prend toute la largeur qu'on lui donne, et ses
   * options la partagent à parts égales.
   *
   * Hors de ce mode le groupe fait la largeur de son contenu, ce qui est la
   * bonne forme pour la paire de langues de la barre latérale — deux options
   * de trois lettres au milieu d'un menu. Ce n'était pas la bonne pour la
   * durée d'un événement : elle occupe une cellule de rangée à elle seule, et
   * trois boutons de 37 px groupés à gauche d'une cellule de 1126 px (mesuré
   * à 1440 px) se lisent comme un oubli plutôt que comme un choix.
   */
  fill?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "gap-[2px] rounded-admin-control bg-admin-segment p-[3px]",
        fill ? "flex w-full" : "inline-flex",
        className,
      )}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={String(option)}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              "admin-focus inline-flex h-7 min-w-9 cursor-pointer items-center justify-center rounded-[6px] px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              // `min-w-9` reste sous `flex-1` : il devient le plancher de
              // l'option, pas sa largeur.
              fill && "flex-1",
              active
                ? "bg-admin-card text-admin-accent-soft-ink shadow-sm"
                : "text-admin-dim hover:text-admin-text",
            )}
          >
            {optionLabel ? optionLabel(option) : option}
          </button>
        );
      })}
    </div>
  );
}
