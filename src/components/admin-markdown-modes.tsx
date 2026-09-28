"use client";

import { cn } from "@/lib/utils";

/**
 * Bloc 119: the Écrire / Côte à côte / Aperçu switch above a Markdown editor.
 *
 * Shared by the legal notice and the guide editor, which both wrap the same
 * @uiw editor and both offer the same three views.
 */
export type MarkdownMode = "edit" | "live" | "preview";

export function MarkdownModeSwitch({
  mode,
  onChange,
  label,
  labels,
}: {
  mode: MarkdownMode;
  onChange: (mode: MarkdownMode) => void;
  /** Names the group: "Affichage de l'éditeur". */
  label: string;
  labels: Record<MarkdownMode, string>;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {(["edit", "live", "preview"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            "admin-focus inline-flex h-[var(--admin-control-h-sm)] items-center rounded-admin-control border px-3 text-sm",
            mode === value
              ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
              : "border-admin-card-border text-admin-dim hover:text-admin-text",
          )}
        >
          {labels[value]}
        </button>
      ))}
    </div>
  );
}
