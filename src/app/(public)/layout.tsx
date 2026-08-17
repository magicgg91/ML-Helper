import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="brand" href="/">
          ML-Helper
        </Link>
        <nav aria-label="Navigation principale">
          <Link href="/tools">Simulateurs</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Administration</Link>
          <ThemeToggle />
        </nav>
      </header>
      {children}
      <footer className="public-footer">
        <span>ML-Helper</span>
        <Link href="/legal">Mentions légales</Link>
      </footer>
    </div>
  );
}
