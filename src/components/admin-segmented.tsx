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
export function AdminSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  optionLabel,
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
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex gap-[2px] rounded-admin-control bg-admin-segment p-[3px]",
        className,
      )}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              "admin-focus inline-flex h-7 min-w-9 cursor-pointer items-center justify-center rounded-[6px] px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
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
