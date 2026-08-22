import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";
import { LocaleToggle } from "../../components/locale-toggle";
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
        <nav aria-label="Navigation principale">
          <Link href="/tools">{navigation("tools")}</Link>
          <Link href="/guides">{navigation("guides")}</Link>
          <Link href="/contact">{t("contact")}</Link>
          <LocaleToggle locales={locales} />
          <ThemeToggle />
        </nav>
      </header>
      {children}
      <footer className="public-footer">
        <span>ML-Helper</span>
        <Link href="/legal">{t("legal")}</Link>
      </footer>
    </div>
  );
}
