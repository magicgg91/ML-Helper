import { connection } from "next/server";
import { ReferenceSwitcherNav } from "@/components/reference-switcher-nav";
import { getCalculatorAvailability } from "@/lib/calculators-server";

// Bloc 52/B: the reference-switcher nav only makes sense on a specific
// reference's page — the /referentiels index already shows every reference
// as an illustrated tile, so showing the same 6 names again as a text nav
// there was redundant. Scoped here to the [slug] segment only, same
// pattern as tools/[slug]/layout.tsx.
export default async function ReferentielDetailLayout({
  children,
}: LayoutProps<"/[locale]/referentiels/[slug]">) {
  // Bloc 62/I review: same connection() fix as [slug]/page.tsx — forces
  // per-request dynamic rendering so an admin toggle actually reaches this
  // nav (it now shows inactive references too, not just filters them out).
  await connection();
  const active = await getCalculatorAvailability();

  return (
    <>
      <ReferenceSwitcherNav active={active} />
      {children}
    </>
  );
}
