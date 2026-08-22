import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";
import { LocaleToggle } from "../../components/locale-toggle";
import { PublicNav } from "../../components/public-nav";
import { getAvailableLocales } from "../../i18n/config";
import { getTranslations } from "next-intl/server";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [t, navigation, locales] = await Promise.all([
    getTranslations("Public"),
    getTranslations("Navigation"),
    getAvailableLocales(),
  ]);
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="brand" href="/">
          ML-Helper
        </Link>
        <div className="public-header-actions">
          <PublicNav
            navLabel="Navigation principale"
            menuLabel={navigation("menu")}
            links={[
              { href: "/tools", label: navigation("tools") },
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
