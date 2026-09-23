import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bloc 119: the admin's status chip — "Tous visibles", "3 valeurs à
 * confirmer", a role, a language code.
 *
 * Five tones, no free colour: a screen that needs a shade the palette does
 * not have is a sign the palette is missing a meaning, not that the chip
 * needs an escape hatch. `accent` chips are also the refonte's cross-links
 * (a reference pointing at the tool that uses it), so the component renders
 * an anchor when it is given an `href`.
 */

export type PillTone = "ok" | "neutral" | "warn" | "accent" | "accent-deep";

const toneClasses: Record<PillTone, string> = {
  ok: "bg-admin-ok text-admin-ok-ink",
  neutral: "bg-admin-neutral text-admin-neutral-ink",
  warn: "bg-admin-warn text-admin-warn-ink",
  accent: "bg-admin-accent-soft text-admin-accent-soft-ink",
  "accent-deep": "bg-admin-accent-deep text-admin-on-accent",
};

const pillClasses =
  "inline-flex h-[var(--admin-pill-h)] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap";

export function Pill({
  tone = "neutral",
  href,
  title,
  className,
  children,
}: {
  tone?: PillTone;
  /** Turns the chip into a link — an accent chip that opens the tool it names. */
  href?: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(pillClasses, toneClasses[tone], className);
  if (href === undefined)
    return (
      <span className={classes} title={title}>
        {children}
      </span>
    );
  return (
    <Link
      className={cn(classes, "admin-focus hover:underline")}
      href={href}
      title={title}
    >
      {children}
    </Link>
  );
}
