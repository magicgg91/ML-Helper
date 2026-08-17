import Link from "next/link";
import { PlayerSettingsPanel } from "@/components/player-settings-panel";

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
        </nav>
      </header>
      <PlayerSettingsPanel />
      {children}
      <footer className="public-footer">
        <span>ML-Helper</span>
        <Link href="/legal">Mentions légales</Link>
      </footer>
    </div>
  );
}
