import { ReferenceSwitcherNav } from "@/components/reference-switcher-nav";
import { getCalculatorAvailability } from "@/lib/calculators-server";

// Bloc 52/B: the reference-switcher nav only makes sense on a specific
// reference's page — the /referentiels index already shows every reference
// as an illustrated tile, so showing the same 6 names again as a text nav
// there was redundant. Scoped here to the [slug] segment only, same
// pattern as tools/[slug]/layout.tsx.
export default async function ReferentielDetailLayout({
  children,
}: LayoutProps<"/referentiels/[slug]">) {
  const active = await getCalculatorAvailability();

  return (
    <>
      <ReferenceSwitcherNav active={active} />
      {children}
    </>
  );
}
