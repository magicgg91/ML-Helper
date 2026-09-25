import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "../../../components/theme-toggle";
import { LocaleToggle } from "../../../components/locale-toggle";
import { PublicNav } from "../../../components/public-nav";
import { PublicFooter } from "../../../components/public-footer";
import { SiteSearch } from "../../../components/site-search";
import { getActiveLocales } from "@/lib/locale-settings";
import { getLocale, getTranslations } from "next-intl/server";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { contactHref } from "@/lib/contact-link";
import { prisma } from "@/lib/prisma";
import { referenceHref } from "@/lib/reference-catalog";
import { resolveFeaturedGuide } from "@/lib/site-highlights";
import { localizedText } from "@/lib/translations";

export default async function PublicLayout({
  children,
}: LayoutProps<"/[locale]">) {
  // Bloc 90/C: the public language selector lists only the currently-active
  // locales — a deactivated language disappears from it (its JSON files stay
  // in the repo, only hidden).
  const [
    t,
    navigation,
    footer,
    tools,
    references,
    locales,
    locale,
    guides,
    active,
  ] = await Promise.all([
    getTranslations("Public"),
    getTranslations("Navigation"),
    getTranslations("footer"),
    getTranslations("tools"),
    getTranslations("references"),
    getActiveLocales(),
    getLocale(),
    prisma.guide.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
    }),
    getCalculatorAvailability(),
  ]);
  const searchGuides = guides.map((guide) => ({
    id: guide.id,
    slug: guide.slug,
    title: localizedText(guide.title, locale),
    excerpt: localizedText(guide.excerpt, locale),
  }));
  // Bloc 129 §2.2 : la colonne « Aide » ouvre sur le guide mis en avant, le
  // même que la carte « Commence ici » (§3.4) — désigné par la configuration,
  // pas par ce gabarit. S'il n'y en a pas, la ligne disparaît plutôt que de
  // pointer dans le vide.
  const startHere = resolveFeaturedGuide(guides);
  return (
    <div className="public-shell">
      <header className="public-header">
        {/* Bloc 132 §1 : le nom seul, sans le sous-titre du Bloc 129. */}
        <Link className="brand" href="/">
          <span className="brand-name">ML-Helper</span>
        </Link>
        <SiteSearch guides={searchGuides} active={active} />
        <div className="public-header-actions">
          <PublicNav
            navLabel={navigation("main")}
            menuLabel={navigation("menu")}
            links={[
              { href: "/tools", label: navigation("tools") },
              { href: "/referentiels", label: navigation("referentiels") },
              { href: "/guides", label: navigation("guides") },
              { href: "/contact", label: t("contact") },
            ]}
          />
          <LocaleToggle locales={locales} />
          <ThemeToggle />
        </div>
      </header>
      {children}
      <PublicFooter
        brand="ML-Helper"
        lead={footer("lead")}
        note={footer("note")}
        navLabel={navigation("footer")}
        columns={[
          {
            title: navigation("tools"),
            links: [
              { href: "/tools/classement", label: tools("ranking") },
              { href: "/tools/combat", label: tools("combat") },
              { href: "/tools/competences", label: tools("skills") },
              { href: "/tools/villes", label: tools("cities") },
            ],
          },
          {
            title: navigation("referentiels"),
            links: [
              {
                href: referenceHref("shop"),
                label: references("catalog.shop"),
              },
              {
                href: referenceHref("combat-equipment"),
                label: references("catalog.combat-equipment"),
              },
              {
                href: referenceHref("gems"),
                label: references("catalog.gems"),
              },
              { href: "/referentiels", label: footer("all-references") },
            ],
          },
          {
            title: footer("help"),
            links: [
              ...(startHere
                ? [
                    {
                      href: `/guides/${startHere.slug}`,
                      label: footer("start-here"),
                    },
                  ]
                : []),
              { href: "/guides", label: footer("all-guides") },
              { href: contactHref("data-error"), label: t("report-error") },
              { href: "/contact", label: t("contact") },
            ],
          },
        ]}
        copyright={footer("copyright", { year: new Date().getFullYear() })}
        legal={{ href: "/legal", label: t("legal") }}
      />
    </div>
  );
}
