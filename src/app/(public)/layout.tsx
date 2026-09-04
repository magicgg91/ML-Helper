import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";
import { LocaleToggle } from "../../components/locale-toggle";
import { PublicNav } from "../../components/public-nav";
import { SiteSearch } from "../../components/site-search";
import { getActiveLocales } from "@/lib/locale-settings";
import { getLocale, getTranslations } from "next-intl/server";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  // Bloc 90/C: the public language selector lists only the currently-active
  // locales — a deactivated language disappears from it (its JSON files stay
  // in the repo, only hidden).
  const [t, navigation, locales, locale, guides, active] = await Promise.all([
    getTranslations("Public"),
    getTranslations("Navigation"),
    getActiveLocales(),
    getLocale(),
    prisma.guide.findMany({
      where: { status: "published", active: true },
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
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="brand" href="/">
          ML-Helper
        </Link>
        <SiteSearch guides={searchGuides} active={active} />
        <div className="public-header-actions">
          <PublicNav
            navLabel="Navigation principale"
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
      <footer className="public-footer">
        <span>ML-Helper</span>
        <Link href="/legal">{t("legal")}</Link>
      </footer>
    </div>
  );
}
