import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedPath } from "@/lib/site-url";

// Bloc 91/M6: a translated 404 replacing Next's English-only default. Rendered
// inside the root layout, so it inherits <html lang> and the theme; the locale
// comes from the middleware's X-NEXT-INTL-LOCALE header (getLocale()), which is
// set for every route including one that ends up not matching. The links are
// built already locale-prefixed so the middleware doesn't re-redirect them.
// noindex on 404s stays automatic (Next sets it), so no robots handling here.
export default async function NotFound() {
  const [t, nav, refs, locale] = await Promise.all([
    getTranslations("notFound"),
    getTranslations("Public"),
    getTranslations("references"),
    getLocale(),
  ]);
  const links = [
    { href: localizedPath(locale, "/"), label: t("home") },
    { href: localizedPath(locale, "/tools"), label: nav("tools") },
    { href: localizedPath(locale, "/referentiels"), label: refs("title") },
    { href: localizedPath(locale, "/guides"), label: nav("guides") },
  ];
  return (
    <main className="not-found">
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <nav className="not-found-links" aria-label={t("title")}>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
