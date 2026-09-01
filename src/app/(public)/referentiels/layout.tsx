// Bloc 52/B: the reference-switcher nav moved to a dedicated [slug]/layout.tsx
// below — the index page (page.tsx) already shows all 6 references as
// illustrated tiles, so repeating them as a text nav here was redundant.
// This layout is now a passthrough, same shape as tools/layout.tsx.
export default function ReferentielsLayout({
  children,
}: LayoutProps<"/referentiels">) {
  return children;
}
