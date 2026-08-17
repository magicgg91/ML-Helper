import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";
import { LocaleSwitcher } from "../../components/locale-switcher";
import { getTranslations } from "next-intl/server";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("Public");
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="brand" href="/">
          ML-Helper
        </Link>
        <nav aria-label="Navigation principale">
          <Link href="/tools">{t("tools")}</Link>
          <Link href="/guides">{t("guides")}</Link>
          <Link href="/contact">{t("contact")}</Link>
          <Link href="/login">{t("admin")}</Link>
          <LocaleSwitcher />
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
