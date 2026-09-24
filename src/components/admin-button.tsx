import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Bloc 119: the admin's button, at the sizes the refonte specifies — 40 px,
 * 34 px in small, 8 px radius (§1).
 *
 * Separate from src/components/ui/button.tsx rather than a new variant of it:
 * that one is the shadcn button, painted from the `--color-primary`/
 * `--color-secondary` aliases of the *site* palette, and it is still what the
 * screens not yet rewritten use. The two coexist for the length of this
 * refonte, then the shadcn one goes with the last screen that imports it.
 *
 * `asChild` renders the styling onto a child element instead — how a
 * `<Link>` gets the look of a button without an anchor nested in a button.
 */
const adminButtonVariants = cva(
  "admin-focus inline-flex cursor-pointer items-center justify-center gap-2 rounded-admin-control text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-admin-accent text-admin-on-accent hover:bg-admin-accent-hover",
        secondary:
          "border border-admin-card-border bg-admin-card text-admin-text hover:border-admin-accent hover:text-admin-accent-soft-ink",
        ghost:
          "text-admin-dim hover:bg-admin-accent-soft hover:text-admin-accent-soft-ink",
        danger:
          "border border-admin-danger-border bg-admin-card text-admin-danger-ink hover:border-admin-danger-ink",
      },
      size: {
        default: "h-[var(--admin-control-h)] px-4",
        sm: "h-[var(--admin-control-h-sm)] px-3",
        icon: "size-[var(--admin-control-h-sm)]",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export function AdminButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof adminButtonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(adminButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { adminButtonVariants };
