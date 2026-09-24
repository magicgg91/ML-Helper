import type { ReactNode } from "react";

/**
 * Bloc 119 §3 bis: one card of an edit screen — a heading, what it is for,
 * and whatever the section needs on its right (language tabs, an "Ajouter"
 * button).
 *
 * Distinct from AdminSettingsSection, which is the Configuration screen's
 * two-column "what it is / what it does" card: here the content is the
 * screen, and the heading sits above it rather than beside it.
 */
export function EditorSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    // aria-label rather than aria-labelledby: it names the region without a
    // generated id, so this stays a server component, and it turns each card
    // of a long edit screen into a landmark a screen reader can jump between.
    <section
      aria-label={title}
      className="flex flex-col gap-4 rounded-admin-card border border-admin-card-border bg-admin-card p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="admin-section-title text-admin-text">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-admin-dim">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
    </section>
  );
}
