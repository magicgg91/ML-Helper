import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

// Bloc 100/C: one collapsible section of the Configuration tab. Every section
// wraps itself in this, so a new one is independently foldable for free
// rather than by growing a special case — which is the whole point, the tab
// is meant to keep gaining sections.
//
// A native <details> carries the disclosure semantics, the keyboard handling
// and the screen-reader announcement on its own, and each element holds its
// own open state: independence is structural here, not something shared state
// has to arbitrate. It also needs no client component, so the sections stay
// on the server like the page around them.
//
// Sections open by default: an admin arriving on the tab sees what is
// configured instead of a stack of closed headers.
export function AdminConfigSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group mb-6 rounded-lg border border-border bg-card"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <h2 className="text-base font-semibold">{title}</h2>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-border px-4 py-4">
        {description && (
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </div>
    </details>
  );
}
