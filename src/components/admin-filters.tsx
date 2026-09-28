"use client";

import { SearchIcon } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Bloc 119: the two controls that sit above every list of the admin — the
 * search field and the row of filter chips.
 *
 * Both are controlled: the screen owns the state, because on some screens it
 * also belongs in the URL (the audit log's filters are shareable query
 * params) and on others it is plain local state.
 */

export type FilterChip<Value extends string> = {
  value: Value;
  label: string;
  /** Shown beside the label — how many rows the chip would leave on screen. */
  count?: number;
};

/**
 * A single-choice filter row.
 *
 * `aria-pressed` rather than a `radiogroup`: these are toggle buttons that
 * re-filter a list in place, and the pressed state is what a screen reader
 * needs to announce. They are grouped so the group's label is read once
 * instead of being repeated into every chip's name.
 */
export function FilterChips<Value extends string>({
  label,
  chips,
  value,
  onChange,
}: {
  label: string;
  chips: readonly FilterChip<Value>[];
  value: Value;
  onChange: (next: Value) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const selected = chip.value === value;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(chip.value)}
            className={cn(
              "admin-focus inline-flex h-[var(--admin-control-h-sm)] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
              selected
                ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
                : "border-admin-card-border bg-admin-card text-admin-dim hover:text-admin-text",
            )}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  selected ? "text-admin-accent-soft-ink" : "text-admin-dim",
                )}
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The search field of a list screen.
 *
 * The label is visually hidden but real: a magnifier glyph names nothing, and
 * several of these screens carry two filter controls side by side.
 */
export function SearchInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="relative">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-dim"
      />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="admin-control admin-focus h-[var(--admin-control-h)] w-full rounded-admin-control border border-admin-card-border bg-admin-card pr-3 pl-9 text-sm text-admin-text placeholder:text-admin-dim"
      />
    </div>
  );
}
