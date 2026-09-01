import { getTranslations } from "next-intl/server";
import { ReferenceSwitcherNav } from "@/components/reference-switcher-nav";
import { getCalculatorAvailability } from "@/lib/calculators-server";

// Bloc 50/E: the reference-switcher banner is promoted from a per-detail-page
// inline element into the section-level header nav of the whole
// /referentiels route. This one layout at the /referentiels segment wraps
// BOTH the index (page.tsx) and every detail page ([slug]/page.tsx) via
// Next.js layout nesting, so no separate [slug]/layout.tsx is needed.
export default async function ReferentielsLayout({
  children,
}: LayoutProps<"/referentiels">) {
  const active = await getCalculatorAvailability();
  const t = await getTranslations("references");

  return (
    <>
      <ReferenceSwitcherNav active={active} t={t} />
      {children}
    </>
  );
}
