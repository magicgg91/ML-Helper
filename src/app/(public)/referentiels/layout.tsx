import { ReferenceSwitcherNav } from "@/components/reference-switcher-nav";
import { getCalculatorAvailability } from "@/lib/calculators-server";

// Bloc 50/E: the reference-switcher banner is promoted from a per-detail-page
// inline element into the section-level header nav of the whole
// /referentiels route. This one layout at the /referentiels segment wraps
// BOTH the index (page.tsx) and every detail page ([slug]/page.tsx) via
// Next.js layout nesting, so no separate [slug]/layout.tsx is needed.
// `active` is passed down as plain data (fine across the server/client
// boundary) — the translator is read directly inside the client component
// instead, since a function can't cross that boundary as a prop.
export default async function ReferentielsLayout({
  children,
}: LayoutProps<"/referentiels">) {
  const active = await getCalculatorAvailability();

  return (
    <>
      <ReferenceSwitcherNav active={active} />
      {children}
    </>
  );
}
